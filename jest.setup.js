
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/pawavotes_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

jest.setTimeout(30000);
