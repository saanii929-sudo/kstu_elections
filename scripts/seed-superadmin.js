/**
 * Seed / reset the superadmin account.
 *
 * Safe to run on production — does NOT touch any other collection.
 *
 * Usage:
 *   node scripts/seed-superadmin.js
 *
 * With a custom URI (Coolify):
 *   MONGODB_URI="mongodb://root:pass@host:27017/pawavotes?directConnection=true" node scripts/seed-superadmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/pawavotes';

const SUPERADMIN = {
  username: 'SuperAdmin',
  email: 'saanii929@gmail.com',
  password: 'Iddi1234!',
  phone: "0509960632",
};

const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ['superadmin', 'admin', 'helpdesk'], default: 'admin' },
    status:   { type: String, enum: ['active', 'inactive'], default: 'active' },
    resetPasswordToken:  { type: String },
    resetPasswordExpiry: { type: Date },
  },
  { timestamps: true }
);

async function run() {
  console.log('\n🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    directConnection: MONGODB_URI.includes('directConnection=true'),
  });
  console.log('✅ Connected\n');

  const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

  const existing = await Admin.findOne({ email: SUPERADMIN.email });

  const hashed = await bcrypt.hash(SUPERADMIN.password, 10);

  if (existing) {
    // Update password and ensure role/status are correct
    await Admin.updateOne(
      { email: SUPERADMIN.email },
      {
        $set: {
          password: hashed,
          role: 'superadmin',
          status: 'active',
          username: SUPERADMIN.username,
          phone: SUPERADMIN.phone,
        },
      }
    );
    console.log('🔄 Superadmin already existed — password and role reset.\n');
  } else {
    await Admin.create({
      username: SUPERADMIN.username,
      email:    SUPERADMIN.email,
      password: hashed,
      phone:    SUPERADMIN.phone,
      role:     'superadmin',
      status:   'active',
    });
    console.log('✅ Superadmin created.\n');
  }

  console.log('📋 Credentials:');
  console.log(`   Email   : ${SUPERADMIN.email}`);
  console.log(`   Password: ${SUPERADMIN.password}`);
  console.log('\n🚀 Login at: /superadmin/login\n');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});
