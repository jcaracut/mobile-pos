import { database } from '@core/database';
import { Category } from '@core/database/models';
import type { CreateCategoryParams } from '../types';

export class CategoryService {
  static async create(params: CreateCategoryParams): Promise<Category> {
    return database.write(async () => {
      return database.get<Category>('categories').create((c) => {
        c.name = params.name;
        c.color = params.color ?? null;
        c.icon = params.icon ?? null;
      });
    });
  }

  static async update(
    categoryId: string,
    params: Partial<CreateCategoryParams>
  ): Promise<Category> {
    return database.write(async () => {
      const category = await database.get<Category>('categories').find(categoryId);
      await category.update((c) => {
        if (params.name !== undefined) c.name = params.name;
        if (params.color !== undefined) c.color = params.color ?? null;
        if (params.icon !== undefined) c.icon = params.icon ?? null;
      });
      return category;
    });
  }

  static async delete(categoryId: string): Promise<void> {
    await database.write(async () => {
      const category = await database.get<Category>('categories').find(categoryId);
      // Null out category_id on all products before deleting to avoid orphans.
      const products = await category.products.fetch();
      await Promise.all(
        products.map((p) =>
          p.update((product) => {
            product.categoryId = null;
          })
        )
      );
      await category.markAsDeleted();
    });
  }

  static async getAll(): Promise<Category[]> {
    return database.get<Category>('categories').query().fetch();
  }
}
