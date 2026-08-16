const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const entries = { en: 'English', tr: 'Türkçe' };

function render(language, label) {
  return source
    .replace('<html lang="en">', `<html lang="${language}">`)
    .replace('<head>', '<head>\n  <base href="../">')
    .replace('<script type="module">', `<script>window.__BakuFixedLanguage = '${language}';</script>\n  <script type="module">`)
    .replace(/\n        <div class="language-switch"[\s\S]*?\n        <\/div>/, `\n        <span class="language-lock" id="languageLock">${label}</span>`);
}

for (const [language, label] of Object.entries(entries)) {
  const outputDirectory = path.join(root, language);
  const outputPath = path.join(outputDirectory, 'index.html');
  const rendered = render(language, label);
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current !== rendered) {
      console.error(`${language}/index.html is stale; run node scripts/build-language-entrypoints.js`);
      process.exitCode = 1;
    }
    continue;
  }
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputPath, rendered);
}
