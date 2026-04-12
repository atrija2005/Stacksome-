const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Stacksome/1.0 RSS Reader' },
});

function toFeedUrl(input) {
  let url = input.trim().toLowerCase();
  if (!url.startsWith('http')) url = 'https://' + url;
  url = url.replace(/\/+$/, '');

  // Normalise plain substack subdomain entries like "foo.substack.com" → feed URL
  if (url.match(/^https?:\/\/[^/]+\.substack\.com$/) && !url.includes('/feed')) {
    return url + '/feed';
  }

  if (!url.includes('/feed')) url = url + '/feed';
  return url;
}

function toCanonicalUrl(input) {
  let url = input.trim().toLowerCase();
  if (!url.startsWith('http')) url = 'https://' + url;
  return url.replace(/\/+$/, '').replace(/\/feed.*$/, '');
}

// Returns true if a URL is (or appears to be) a Substack publication
function isSubstackUrl(url) {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('.substack.com')) return true;
  // Known Substack custom domains (checked manually)
  const knownCustomDomains = [
    'lennysnewsletter.com',
    'newsletter.pragmaticengineer.com',
    'notboring.co',
    'www.notboring.co',
    'www.platformer.news',
    'www.netinterest.co',
    'www.piratewires.com',
    'refactoring.fm',
    'www.garbageday.email',
    'therebooting.substack.com',
  ];
  return knownCustomDomains.some(d => u.includes(d));
}

async function validateAndParseFeed(feedUrl) {
  const feed = await parser.parseURL(feedUrl);
  return {
    title: feed.title || 'Unknown Publication',
    items: feed.items || [],
  };
}

async function fetchFeed(feedUrl) {
  const feed = await parser.parseURL(feedUrl);
  return (feed.items || []).map((item) => ({
    title: item.title || 'Untitled',
    description: stripHtml(item.contentSnippet || item.summary || item.content || '').slice(0, 500),
    url: item.link || item.guid || '',
    publishedAt: toIso(item.isoDate || item.pubDate),
  }));
}

function toIso(dateStr) {
  if (!dateStr) return new Date().toISOString();
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

module.exports = { toFeedUrl, toCanonicalUrl, validateAndParseFeed, fetchFeed, isSubstackUrl };
