const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pawavotes';

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

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

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  address: String,
  website: String,
  description: String,
  logo: String,
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  role: { type: String, default: 'organization' },
  createdBy: String,
  serviceFeePercentage: { type: Number, default: 10 },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
  },
}, { timestamps: true });

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
    const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
    await Organization.deleteMany({});

    const existingSuperAdmin = await Admin.findOne({ role: 'superadmin' });
    if (!existingSuperAdmin) {
      const hashedPassword = await hashPassword('Iddi1234!');
      await Admin.create({
        username: 'PawaVotesAdmin',
        email: 'admin@pawavotes.com',
        password: hashedPassword,
        role: 'superadmin',
        status: 'active',
      });
    } else {
      console.log('ℹ️  SuperAdmin already exists\n');
    }
    
    for (const orgData of sampleOrganizations) {
      const hashedPassword = await hashPassword(orgData.password);
      const org = await Organization.create({
        ...orgData,
        password: hashedPassword,
        createdBy: 'superadmin',
        role: 'organization',
        serviceFeePercentage: 10,
      });
    }
    const totalOrgs = await Organization.countDocuments();
    const activeOrgs = await Organization.countDocuments({ status: 'active' });
    const inactiveOrgs = await Organization.countDocuments({ status: 'inactive' });

    console.log('📊 Seeding Summary:');
    console.log(`   Total Organizations: ${totalOrgs}`);
    console.log(`   Active: ${activeOrgs}`);
    console.log(`   Inactive: ${inactiveOrgs}`);
    console.log('\n✨ Database seeding completed successfully!\n');

    console.log('🚀 You can now:');
    console.log('   1. Login at: /superadmin/login');
    console.log('   2. Use credentials: admin@pawavotes.com / admin123\n');

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
