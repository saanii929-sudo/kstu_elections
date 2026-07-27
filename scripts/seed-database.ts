/**
 * Database Seeder Script
 * Seeds the database with sample data for testing
 * 
 * Run with: npx ts-node scripts/seed-database.ts
 * Or add to package.json and run: npm run seed
 */

import mongoose from 'mongoose';
import { hashPassword } from '../lib/auth';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pawavotes';

// Sample organizations data
const sampleOrganizations = [
  {
    name: 'Ghana Music Awards',
    email: 'info@ghanamusicawards.com',
    password: 'GMA@2024',
    phone: '+233244123456',
    address: 'Accra, Ghana',
    website: 'https://ghanamusicawards.com',
    description: 'Premier music awards in Ghana celebrating excellence in music',
    status: 'active',
  },
  {
    name: 'African Tech Summit',
    email: 'contact@africantechsummit.com',
    password: 'ATS@2024',
    phone: '+233244789012',
    address: 'Lagos, Nigeria',
    website: 'https://africantechsummit.com',
    description: 'Annual technology conference and awards',
    status: 'active',
  },
  {
    name: 'East Africa Business Awards',
    email: 'info@eabusinessawards.com',
    password: 'EABA@2024',
    phone: '+254712345678',
    address: 'Nairobi, Kenya',
    website: 'https://eabusinessawards.com',
    description: 'Recognizing business excellence in East Africa',
    status: 'active',
  },
  {
    name: 'West African Film Festival',
    email: 'contact@wafilmfest.com',
    password: 'WAFF@2024',
    phone: '+233244567890',
    address: 'Accra, Ghana',
    website: 'https://wafilmfest.com',
    description: 'Celebrating African cinema and filmmakers',
    status: 'inactive',
  },
  {
    name: 'Pan-African Sports Awards',
    email: 'info@pasportsawards.com',
    password: 'PASA@2024',
    phone: '+27821234567',
    address: 'Johannesburg, South Africa',
    website: 'https://pasportsawards.com',
    description: 'Honoring sporting achievements across Africa',
    status: 'active',
  },
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const Organization = (await import('../models/Organization')).default;
    const Admin = (await import('../models/Admin')).default;

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing organizations...');
    await Organization.deleteMany({});
    console.log('✅ Cleared organizations\n');

    // Create SuperAdmin if not exists
    const existingSuperAdmin = await Admin.findOne({ role: 'superadmin' });
    if (!existingSuperAdmin) {
      console.log('👤 Creating SuperAdmin...');
      const hashedPassword = await hashPassword('Admin@123');
      await Admin.create({
        username: 'admin',
        email: 'admin@pawavotes.com',
        password: hashedPassword,
        role: 'superadmin',
        status: 'active',
      });
      console.log('✅ SuperAdmin created');
      console.log('   Email: admin@pawavotes.com');
      console.log('   Password: Admin@123\n');
    } else {
      console.log('ℹ️  SuperAdmin already exists\n');
    }

    // Create sample organizations
    console.log('🏢 Creating sample organizations...\n');
    
    for (const orgData of sampleOrganizations) {
      const hashedPassword = await hashPassword(orgData.password);
      const org = await Organization.create({
        ...orgData,
        password: hashedPassword,
        createdBy: 'superadmin',
      });
      
      console.log(`✅ Created: ${org.name}`);
      console.log(`   Email: ${orgData.email}`);
      console.log(`   Password: ${orgData.password}`);
      console.log(`   Status: ${org.status}\n`);
    }

    // Display summary
    const totalOrgs = await Organization.countDocuments();
    const activeOrgs = await Organization.countDocuments({ status: 'active' });
    const inactiveOrgs = await Organization.countDocuments({ status: 'inactive' });

    console.log('📊 Seeding Summary:');
    console.log(`   Total Organizations: ${totalOrgs}`);
    console.log(`   Active: ${activeOrgs}`);
    console.log(`   Inactive: ${inactiveOrgs}`);
    console.log('\n✨ Database seeding completed successfully!\n');

    console.log('🚀 You can now:');
    console.log('   1. Start the dev server: npm run dev');
    console.log('   2. Login at: http://localhost:3000/superadmin/login');
    console.log('   3. Use credentials: admin@pawavotes.com / Admin@123\n');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();
