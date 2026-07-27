import Category, { ICategory } from '@/models/Category';
import { CreateCategoryInput, UpdateCategoryInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class CategoryService {
  async createCategory(data: CreateCategoryInput): Promise<ICategory> {
    await connectDB();
    
    const category = new Category(data);
    return await category.save();
  }

  async getCategoryById(categoryId: string): Promise<ICategory> {
    await connectDB();
    
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError(404, 'Category not found');
    }
    
    return category;
  }

  async getCategoriesByAward(awardId: string, page = 1, limit = 50) {
    await connectDB();
    
    const skip = (page - 1) * limit;
    
    const categories = await Category.find({ awardId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Category.countDocuments({ awardId });
    
    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateCategory(categoryId: string, data: UpdateCategoryInput): Promise<ICategory> {
    await connectDB();
    
    const category = await Category.findByIdAndUpdate(categoryId, data, {
      new: true,
      runValidators: true,
    });
    
    if (!category) {
      throw new AppError(404, 'Category not found');
    }
    
    return category;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await connectDB();
    
    const result = await Category.findByIdAndDelete(categoryId);
    
    if (!result) {
      throw new AppError(404, 'Category not found');
    }
  }

  async publishCategory(categoryId: string): Promise<ICategory> {
    await connectDB();
    
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { status: 'published' },
      { new: true }
    );
    
    if (!category) {
      throw new AppError(404, 'Category not found');
    }
    
    return category;
  }

  async incrementNomineeCount(awardId: string): Promise<void> {
    await connectDB();
    
    await Category.updateMany(
      { awardId },
      { $inc: { nomineeCount: 1 } }
    );
  }

  async incrementVoteCount(categoryId: string, count = 1): Promise<void> {
    await connectDB();
    
    await Category.findByIdAndUpdate(
      categoryId,
      { $inc: { voteCount: count } }
    );
  }
}

export const categoryService = new CategoryService();
