const fs = require('fs');
const content = fs.readFileSync('c:/Users/SHASHANK K 11/OneDrive/Desktop/LAP/etherballot/SCREENSHOTS.md', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.toLowerCase().includes('capstone') || l.toLowerCase().includes('poster')) {
    console.log(`${idx+1}: ${l}`);
  }
});
