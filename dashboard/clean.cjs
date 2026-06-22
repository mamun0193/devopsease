const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  content = content.replace(/import\s+Header\s+from\s+['"]\.\.\/components\/Header['"];?\r?\n/g, '');
  content = content.replace(/import\s+ResourceNav\s+from\s+['"]\.\.\/components\/ResourceNav['"];?\r?\n/g, '');

  content = content.replace(/<Header[^>]*\/>\r?\n?/g, '');
  content = content.replace(/<ResourceNav[^>]*\/>\r?\n?/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
  }
}
