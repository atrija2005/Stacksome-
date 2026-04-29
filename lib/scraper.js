'use strict';

/**
 * lib/scraper.js
 * Single source of truth for all Firecrawl interactions.
 * Imported by lib/claude.js — never call FirecrawlApp anywhere else.
 */

const FirecrawlApp = require('@mendable/firecrawl-js').default;

const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null;

function isAvailable() { return !!firecrawl; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripMarkdown(str = '') {
  return str
    .replace(/!\[.*?\]\(.*?\)/g, '')   // images
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // links → text
    .replace(/#{1,6}\s*/g, '')          // headings
    .replace(/[*_`~>]/g, '')            // bold/italic/code/blockquote
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitleFromMarkdown(md) {
  // First # heading in the markdown
  const match = md.match(/^#{1,2}\s+(.+)$/m);
  if (match) return match[1].replace(/[*_`]/g, '').trim();
  return null;
}

function extractDescriptionFromMarkdown(md, titleLine) {
  // Take the first real paragraph after the title
  const lines = md.split('\n').filter(l => l.trim());
  let pastTitle = false;
  const paragraphs = [];
  for (const line of lines) {
    const clean = line.trim();
    if (!pastTitle) {
      if (clean === titleLine || /^#{1,2}\s/.test(clean)) pastTitle = true;
      continue;
    }
    // Skip sub-headings, image lines, short lines
    if (/^#{1,6}\s/.test(clean)) continue;
    if (/^!\[/.test(clean)) continue;
    if (clean.length < 40) continue;
    paragraphs.push(stripMarkdown(clean));
    if (paragraphs.join(' ').length > 300) break;
  }
  return paragraphs.join(' ').slice(0, 400).trim();
}

// ── scrapePost ────────────────────────────────────────────────────────────────

/**
 * Scrape a single Substack post page.
 * Returns { ok, markdown, title, description, error? }
 */
async function scrapePost(url) {
  if (!firecrawl) return { ok: false, markdown: '', title: null, description: null, error: 'Firecrawl not configured' };
  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 12000,
    });

    if (!result || !result.markdown) {
      return { ok: false, markdown: '', title: null, description: null, error: 'No markdown returned' };
    }

    const md        = result.markdown.slice(0, 5000);
    const title     = extractTitleFromMarkdown(md) || null;
    const titleLine = title ? `# ${title}` : '';
    const description = extractDescriptionFromMarkdown(md, titleLine);

    console.log(`[scraper] scrapePost OK: "${(title || url).slice(0, 60)}"`);
    return { ok: true, markdown: md, title, description };

  } catch (err) {
    console.warn(`[scraper] scrapePost failed for ${url}:`, err.message);
    return { ok: false, markdown: '', title: null, description: null, error: err.message };
  }
}

// ── discoverPubPosts ──────────────────────────────────────────────────────────

/**
 * Scrape a publication homepage and return real post URLs.
 * Returns { ok, posts[], error? }
 */
async function discoverPubPosts(pubUrl) {
  if (!firecrawl) return { ok: false, posts: [], error: 'Firecrawl not configured' };
  try {
    const baseUrl = pubUrl.replace(/\/$/, '');
    const result  = await firecrawl.scrapeUrl(baseUrl, {
      formats: ['links', 'markdown'],
      onlyMainContent: false,
      timeout: 15000,
    });

    const links = (result.links || []).filter(l =>
      typeof l === 'string' &&
      /\/p\/[a-z0-9-]{4,}/.test(l) &&
      !l.includes('?') &&
      !l.endsWith('/comments')
    );

    const seen  = new Set();
    const posts = [];
    const md    = result.markdown || '';

    for (const url of links) {
      const clean = url.split('#')[0].replace(/\/$/, '');
      if (seen.has(clean)) continue;
      seen.add(clean);

      const slug = clean.split('/p/')[1] || '';

      // Try to find the real title near the slug in the markdown
      let title = null;
      const slugIdx = md.indexOf(slug);
      if (slugIdx !== -1) {
        const nearby = md.slice(Math.max(0, slugIdx - 200), slugIdx + 200);
        const headingMatch = nearby.match(/#{1,3}\s+([^\n]{10,80})/);
        if (headingMatch) title = headingMatch[1].replace(/[*_`]/g, '').trim();
      }
      if (!title) {
        // Derive from slug
        title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      const pubName = baseUrl
        .replace(/^https?:\/\//, '')
        .replace(/\.substack\.com.*/, '')
        .replace(/www\./, '');

      posts.push({
        publication_name: pubName,
        title,
        url: clean,
        description: '',
        published_at: new Date().toISOString(),
        _source: 'firecrawl-discover',
        _titleFromSlug: !md.includes(slug),
        _profileScore: 80,
        _reactions: 0,
        _comments: 0,
        _engagement: 0,
      });

      if (posts.length >= 25) break;
    }

    console.log(`[scraper] discoverPubPosts ${baseUrl} → ${posts.length} posts`);
    return { ok: true, posts };

  } catch (err) {
    console.warn(`[scraper] discoverPubPosts failed for ${pubUrl}:`, err.message);
    return { ok: false, posts: [], error: err.message };
  }
}

// ── searchSubstackPosts ───────────────────────────────────────────────────────

/**
 * Search for Substack posts on a topic using Firecrawl's web search.
 * Much more reliable than Substack's own API (which blocks unauthenticated requests).
 * Returns [{ publication_name, title, description, url, published_at }]
 */
async function searchSubstackPosts(query, limit = 20) {
  if (!firecrawl) return [];
  try {
    const result = await firecrawl.search(`${query} site:substack.com`, { limit });
    // SDK returns { web: [...] } — not { data: [...] }
    const hits = result.web || result.data || [];

    return hits
      .filter(r => r.url && r.title)
      .map(r => {
        // Extract pub name from URL: "something.substack.com/p/slug" → "Something"
        const pubMatch = r.url.match(/https?:\/\/([^.]+)\.substack\.com/);
        const pubName = pubMatch
          ? pubMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : 'Substack';
        return {
          publication_name: pubName,
          title:            (r.title || '').replace(/\s*[-|]\s*[^-|]{1,40}$/, '').trim(),
          description:      (r.description || '').slice(0, 400),
          url:              r.url,
          published_at:     new Date().toISOString(),
          _source:          'firecrawl-search',
        };
      });
  } catch (err) {
    console.warn('[scraper] searchSubstackPosts failed:', err.message);
    return [];
  }
}

module.exports = { isAvailable, scrapePost, discoverPubPosts, searchSubstackPosts };
