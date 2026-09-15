require('dotenv').config();

const Admin = require('./models/Admin');
const connectDB = require('./config/db');

/**
 * CLI tool to seed the initial Super Admin account.
 * This script uses the common database connection logic (with MongoMemoryServer fallback).
 */
const seedAdmin = async () => {
  console.log('\n🚀 Starting Admin Seeding Process...');
  
  try {
    // Connect using common configuration (handles Local DB vs Memory DB)
    await connectDB();
    
    // Check if super admin already exists
    let admin = await Admin.findOne({ role: 'super_admin' });
    
    const adminData = {
      username: process.env.SUPER_ADMIN_USERNAME || 'superadmin',
      password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
      name: process.env.SUPER_ADMIN_NAME || 'Super Administrator',
      email: process.env.SUPER_ADMIN_EMAIL || 'admin@etherballot.com',
      role: 'super_admin'
    };

    if (admin) {
      console.log('ℹ️  Super Admin already exists! Updating credentials to defaults...');
      admin.username = adminData.username;
      admin.password = adminData.password; // This will trigger the pre-save hash hook
      await admin.save();
    } else {
      admin = await Admin.create(adminData);
      console.log('✅ New Super Admin created successfully!');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉  ADMIN SETUP COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤  Username: ${adminData.username}`);
    console.log(`🔑  Password: ${adminData.password}`);
    console.log(`🏷️  Role:     ${adminData.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('👋 Seeding utility finishing. You can now start the server with: npm run dev');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR SEEDING ADMIN:');
    console.error(error.message);
    process.exit(1);
  }
};

seedAdmin();
