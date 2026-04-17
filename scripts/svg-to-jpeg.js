/**
 * Converts all brand SVGs to high-quality JPEGs using the Sharp library.
 * Run: node scripts/svg-to-jpeg.js
 */
const path = require('path');
const fs   = require('fs');

const PUBLIC = path.join(__dirname, '../public');

const FILES = [
  { svg: 'logo-icon.svg',       out: 'logo-icon.jpg',       width: 1024, height: 1024 },
  { svg: 'logo-dark.svg',       out: 'logo-dark.jpg',       width: 1360, height: 280  },
  { svg: 'logo.svg',            out: 'logo.jpg',             width: 1360, height: 280  },
  { svg: 'linkedin-cover.svg',  out: 'linkedin-cover.jpg',  width: 1584, height: 396  },
];

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('Installing sharp...');
    require('child_process').execSync('npm install sharp --save-dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    sharp = require('sharp');
  }

  for (const f of FILES) {
    const svgPath  = path.join(PUBLIC, f.svg);
    const jpegPath = path.join(PUBLIC, f.out);

    if (!fs.existsSync(svgPath)) {
      console.warn(`  ✗  ${f.svg} not found, skipping`);
      continue;
    }

    const svgBuf = fs.readFileSync(svgPath);
    await sharp(svgBuf, { density: 300 })
      .resize(f.width, f.height, { fit: 'contain', background: '#0A0A0A' })
      .jpeg({ quality: 97, chromaSubsampling: '4:4:4' })
      .toFile(jpegPath);

    const kb = (fs.statSync(jpegPath).size / 1024).toFixed(0);
    console.log(`  ✓  ${f.out}  (${f.width}×${f.height}, ${kb} KB)`);
  }

  console.log('\nDone. Files written to public/');
}

main().catch(err => { console.error(err.message); process.exit(1); });
