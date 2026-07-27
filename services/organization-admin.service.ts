import OrganizationAdmin, { IOrganizationAdmin } from '@/models/OrganizationAdmin';
import { CreateOrganizationAdminInput, UpdateOrganizationAdminInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class OrganizationAdminService {
  async addAdmin(data: CreateOrganizationAdminInput): Promise<IOrganizationAdmin> {
    await connectDB();
    
    const orgAdmin = new OrganizationAdmin(data);
    return await orgAdmin.save();
  }

  async getOrgAdminById(id: string): Promise<IOrganizationAdmin> {
    await connectDB();
    
    const orgAdmin = await OrganizationAdmin.findById(id)
      .populate('adminId')
      .populate('organizationId');
    
    if (!orgAdmin) {
      throw new AppError(404, 'Organization admin not found');
    }
    
    return orgAdmin;
  }

  async getAdminsByOrganization(organizationId: string, page = 1, limit = 50) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const admins = await OrganizationAdmin.find({ organizationId })
      .skip(skip)
      .limit(limit)
      .populate('adminId')
      .sort({ createdAt: -1 });
    
    const total = await OrganizationAdmin.countDocuments({ organizationId });
    
    return {
      admins,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getOrganizationsByAdmin(adminId: string) {
    await connectDB();
    
    return await OrganizationAdmin.find({ adminId })
      .populate('organizationId')
      .sort({ createdAt: -1 });
  }

  async updateOrgAdmin(id: string, data: UpdateOrganizationAdminInput): Promise<IOrganizationAdmin> {
    await connectDB();
    
    const orgAdmin = await OrganizationAdmin.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    
    if (!orgAdmin) {
      throw new AppError(404, 'Organization admin not found');
    }
    
    return orgAdmin;
  }

  async removeAdmin(id: string): Promise<void> {
    await connectDB();
    
    const result = await OrganizationAdmin.findByIdAndDelete(id);
    
    if (!result) {
      throw new AppError(404, 'Organization admin not found');
    }
  }

  async checkAdminAccess(adminId: string, organizationId: string): Promise<boolean> {
    await connectDB();
    
    const orgAdmin = await OrganizationAdmin.findOne({
      adminId,
      organizationId,
      status: 'active',
    });
    
    return !!orgAdmin;
  }
}

export const organizationAdminService = new OrganizationAdminService();
