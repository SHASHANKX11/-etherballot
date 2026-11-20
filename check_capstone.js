const fs = require('fs');
['README.md', 'SCREENSHOTS.md'].forEach(f => {
  const content = fs.readFileSync('c:/Users/SHASHANK K 11/OneDrive/Desktop/LAP/etherballot/' + f, 'utf8');
  if (content.includes('Academic Capstone')) {
    console.log(`FOUND in ${f}`);
  }
});
