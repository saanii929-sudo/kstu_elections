import Admin from '@/models/Admin';
import Organization from '@/models/Organization';
import { generateToken } from '@/lib/jwt';
import { hashPassword, comparePassword } from '@/utils/helpers';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';
import { LoginInput, OrganizationRegistrationInput } from '@/lib/schemas';

export class AuthService {
  async registerOrganization(data: OrganizationRegistrationInput) {
    await connectDB();
    
    // Check if email already exists
    const existingOrg = await Organization.findOne({ email: data.email });
    if (existingOrg) {
      throw new AppError(409, 'Organization email already exists');
    }
    
    // Hash password
    const hashedPassword = await hashPassword(data.password);
    
    // Create organization
    const organization = new Organization({
      ...data,
      password: hashedPassword,
      status: 'active',
    });
    
    await organization.save();
    
    // Generate token
    const token = generateToken({
      id: organization._id.toString(),
      email: organization.email,
      role: 'organization',
      organizationId: organization._id.toString(),
    });
    
    return {
      token,
      user: {
        id: organization._id,
        name: organization.name,
        email: organization.email,
        role: 'organization',
      },
    };
  }

  async loginAdmin(email: string, password: string) {
    await connectDB();
    
    const admin = await Admin.findOne({ email });
    if (!admin) {
      throw new AppError(401, 'Invalid email or password');
    }
    
    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }
    
    if (admin.status === 'inactive') {
      throw new AppError(403, 'Admin account is inactive');
    }
    
    const token = generateToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });
    
    return {
      token,
      user: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        username: admin.username,
      },
    };
  }

  async loginOrganization(email: string, password: string) {
    await connectDB();
    
    const organization = await Organization.findOne({ email });
    if (!organization) {
      throw new AppError(401, 'Invalid email or password');
    }
    
    const isPasswordValid = await comparePassword(password, organization.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }
    
    if (organization.status !== 'active') {
      throw new AppError(403, `Organization is ${organization.status}`);
    }
    
    const token = generateToken({
      id: organization._id.toString(),
      email: organization.email,
      role: 'organization',
      organizationId: organization._id.toString(),
    });
    
    return {
      token,
      user: {
        id: organization._id,
        name: organization.name,
        email: organization.email,
        role: 'organization',
      },
    };
  }

  async login(data: LoginInput) {
    const { email, password, userType } = data;
    
    if (userType === 'organization') {
      return this.loginOrganization(email, password);
    } else if (['superadmin', 'admin'].includes(userType)) {
      return this.loginAdmin(email, password);
    } else {
      throw new AppError(400, 'Invalid user type');
    }
  }
}

export const authService = new AuthService();
