/**
 * EtherBallot — Auto-copy uploaded live screenshots to assets/screenshots/
 */
const fs = require('fs');
const path = require('path');

const uploadsDir = 'C:\\Users\\SHASHANK K 11\\.gemini\\antigravity\\brain\\0133a98c-26c9-4afe-98ef-d7f9941c469b\\.user_uploaded';
const targetDir = path.join(__dirname, 'assets', 'screenshots');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const screenshotMapping = [
  {
    src: 'media_1795169348844_f00e8ec1.jpg',
    dest: 'live_01_home_hero.jpg',
    title: 'Citizen Portal & Sovereign Hero'
  },
  {
    src: 'media_1795169348840_f0d985eb.jpg',
    dest: 'live_02_admin_login.jpg',
    title: 'Election Official Portal Login'
  },
  {
    src: 'media_1795169348871_4a743c7b.jpg',
    dest: 'live_03_digital_voter_card.jpg',
    title: 'My Digital Voter ID Card (e-EPIC)'
  },
  {
    src: 'media_1795169348873_136b0c02.jpg',
    dest: 'live_04_camera_qr_scanner.jpg',
    title: 'Polling Station Camera QR Scanner'
  },
  {
    src: 'media_1795169348833_a349c635.jpg',
    dest: 'live_05_admin_voter_roll.jpg',
    title: 'Voter ID Registry & QR Credentials'
  },
  {
    src: 'media_1795169348848_1c361758.jpg',
    dest: 'live_06_admin_audit_logs.jpg',
    title: 'Admin Audit Logs & Activity History'
  },
  {
    src: 'media_1795169348863_9e5111ae.jpg',
    dest: 'live_07_capstone_project_poster.jpg',
    title: 'Capstone Project Technical Poster (RLJIT)'
  }
];

console.log('🔄 Copying live screenshots into assets/screenshots/...');

let copied = 0;
for (const item of screenshotMapping) {
  const srcPath = path.join(uploadsDir, item.src);
  const destPath = path.join(targetDir, item.dest);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ [${copied + 1}/7] Copied ${item.dest} (${item.title})`);
    copied++;
  } else {
    console.warn(`⚠️ Source file not found: ${srcPath}`);
  }
}

console.log(`\n🎉 Successfully processed ${copied} live screenshots into ${targetDir}`);
