const fs = require('fs');
const path = require('path');

const directoriesToScan = [
  'src/screens/products',
  'src/screens/profile',
  'src/screens/quotes',
  'src/components/ProductCard.tsx',
  'src/components/QuoteCard.tsx',
];

const basePath = '/home/cctns/Documents/Projects/quote-native-app';

function processPath(p) {
  const fullPath = path.join(basePath, p);
  if (!fs.existsSync(fullPath)) return;
  
  if (fs.statSync(fullPath).isDirectory()) {
    const files = fs.readdirSync(fullPath);
    for (const file of files) {
      processPath(path.join(p, file));
    }
  } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('colors.accent')) {
      content = content.replace(/colors\.accent/g, 'colors.primary');
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log('Updated', fullPath);
    }
  }
}

for (const dir of directoriesToScan) {
  processPath(dir);
}
console.log('Replacement complete.');
