import connectDB from '@/lib/mongodb';
import Award from '@/models/Award';
import Category from '@/models/Category';
import Nominee from '@/models/Nominee';
import Admin from '@/models/Admin';
import Organization from '@/models/Organization';
import { hashPassword } from '@/utils/helpers';

// Sample static data from components
const AWARDS_DATA = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: '2026 Students Awards',
    organizationId: '507f1f77bcf86cd799439001',
    image: '/images/events/event-1.png',
    status: 'active',
    showResults: true,
    pricingType: 'paid',
    votingCost: 0.5,
    published: true,
    normalVotingEnabled: true,
    bulkVotingEnabled: false,
    socialVotingEnabled: false,
    facebookEnabled: false,
    twitterEnabled: false,
    nominationEnabled: false,
    createdBy: '507f1f77bcf86cd799439001',
  },
  {
    _id: '507f1f77bcf86cd799439012',
    name: '2026 Students Awards',
    organizationId: '507f1f77bcf86cd799439002',
    image: '/images/events/event-2.png',
    status: 'active',
    showResults: false,
    pricingType: 'paid',
    votingCost: 0.5,
    published: true,
    normalVotingEnabled: true,
    bulkVotingEnabled: false,
    socialVotingEnabled: false,
    facebookEnabled: false,
    twitterEnabled: false,
    nominationEnabled: false,
    createdBy: '507f1f77bcf86cd799439002',
  },
];

const CATEGORIES_DATA = [
  {
    _id: '507f1f77bcf86cd799439111',
    name: 'Student photographer of the year',
    awardId: '507f1f77bcf86cd799439011',
    status: 'published',
    nomineeCount: 5,
    voteCount: 200,
  },
  {
    _id: '507f1f77bcf86cd799439112',
    name: 'Ideal woman of the year',
    awardId: '507f1f77bcf86cd799439011',
    status: 'published',
    nomineeCount: 5,
    voteCount: 100,
  },
  {
    _id: '507f1f77bcf86cd799439113',
    name: 'Student entrepreneur of the year',
    awardId: '507f1f77bcf86cd799439011',
    status: 'published',
    nomineeCount: 5,
    voteCount: 150,
  },
  {
    _id: '507f1f77bcf86cd799439114',
    name: 'Innovative student of the year',
    awardId: '507f1f77bcf86cd799439011',
    status: 'published',
    nomineeCount: 5,
    voteCount: 120,
  },
];

const NOMINEES_DATA = [
  {
    _id: '507f1f77bcf86cd799439211',
    name: 'Kweku Flick',
    awardId: '507f1f77bcf86cd799439011',
    categoryId: '507f1f77bcf86cd799439111',
    status: 'published',
    nominationStatus: 'accepted',
    voteCount: 200,
  },
  {
    _id: '507f1f77bcf86cd799439212',
    name: 'Black Sherif',
    awardId: '507f1f77bcf86cd799439011',
    categoryId: '507f1f77bcf86cd799439111',
    status: 'published',
    nominationStatus: 'accepted',
    voteCount: 150,
  },
  {
    _id: '507f1f77bcf86cd799439213',
    name: 'Gyakie',
    awardId: '507f1f77bcf86cd799439011',
    categoryId: '507f1f77bcf86cd799439111',
    status: 'published',
    nominationStatus: 'accepted',
    voteCount: 180,
  },
  {
    _id: '507f1f77bcf86cd799439214',
    name: 'Amaarae',
    awardId: '507f1f77bcf86cd799439011',
    categoryId: '507f1f77bcf86cd799439111',
    status: 'published',
    nominationStatus: 'accepted',
    voteCount: 50,
  },
  {
    _id: '507f1f77bcf86cd799439215',
    name: 'King Promise',
    awardId: '507f1f77bcf86cd799439011',
    categoryId: '507f1f77bcf86cd799439111',
    status: 'published',
    nominationStatus: 'accepted',
    voteCount: 100,
  },
];

const ORGANIZATION_DATA = [
  {
    _id: '507f1f77bcf86cd799439001',
    name: 'Kumasi Technical University',
    email: 'admin@ktu.edu.gh',
    password: '',
    phone: '+233201234567',
    address: 'Kumasi, Ghana',
    website: 'https://ktu.edu.gh',
    description: 'A leading technical university in Ghana',
    status: 'active',
    subscriptionPlan: 'premium',
    createdBy: 'superadmin',
  },
];

const ADMIN_DATA = [
  {
    _id: '507f1f77bcf86cd799439301',
    username: 'superadmin',
    email: 'superadmin@pawavotes.com',
    password: '',
    role: 'superadmin',
    status: 'active',
  },
];

export const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    await Promise.all([
      Award.deleteMany({}),
      Category.deleteMany({}),
      Nominee.deleteMany({}),
      Admin.deleteMany({}),
      Organization.deleteMany({}),
    ]);
    
    console.log('🗑️  Cleared existing data');
    
    // Hash passwords
    const adminPassword = await hashPassword('admin123');
    const orgPassword = await hashPassword('org123');
    
    // Seed Admins
    const adminsWithPassword = await Promise.all(
      ADMIN_DATA.map(async (admin) => ({
        ...admin,
        password: adminPassword,
      }))
    );
    await Admin.insertMany(adminsWithPassword);
    console.log('✅ Admins seeded');
    
    // Seed Organizations
    const orgsWithPassword = await Promise.all(
      ORGANIZATION_DATA.map(async (org) => ({
        ...org,
        password: orgPassword,
      }))
    );
    await Organization.insertMany(orgsWithPassword);
    console.log('✅ Organizations seeded');
    
    // Seed Awards
    await Award.insertMany(AWARDS_DATA);
    console.log('✅ Awards seeded');
    
    // Seed Categories
    await Category.insertMany(CATEGORIES_DATA);
    console.log('✅ Categories seeded');
    
    // Seed Nominees
    await Nominee.insertMany(NOMINEES_DATA);
    console.log('✅ Nominees seeded');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Default Credentials:');
    console.log('   SuperAdmin Email: superadmin@pawavotes.com');
    console.log('   SuperAdmin Password: admin123');
    console.log('   Organization Email: admin@ktu.edu.gh');
    console.log('   Organization Password: org123');
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n✨ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding error:', error);
      process.exit(1);
    });
}
