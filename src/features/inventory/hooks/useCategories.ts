import { useState, useEffect } from 'react';
import { database } from '@core/database';
import { Category } from '@core/database/models';

interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sub = database
      .get<Category>('categories')
      .query()
      .observe()
      .subscribe((rows) => {
        setCategories(rows.sort((a, b) => a.name.localeCompare(b.name)));
        setIsLoading(false);
      });

    return () => sub.unsubscribe();
  }, []);

  return { categories, isLoading };
}
