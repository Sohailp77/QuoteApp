import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Category } from '../types';
import { animateLayout } from '../utils/animation';

export const useCategories = () => {
  const user = useAuthStore((s) => s.user);
  const categories = useAppStore((s) => s.categories);
  const setCategories = useAppStore((s) => s.setCategories);
  const categoriesLoaded = useAppStore((s) => s.categoriesLoaded);
  const setCategoriesLoaded = useAppStore((s) => s.setCategoriesLoaded);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (force = false) => {
    if (!user) return;
    if (categoriesLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.CATEGORIES,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(100)
        ]
      });

      const mappedCategories = response.rows.map((c) => ({
        id: c.$id,
        tenant_id: c.tenant_id,
        name: c.name || '',
        is_active: c.is_active !== false,
        unit_name: c.unit_name || null,
        calc_type: c.calc_type || 'pcs',
        image_url: c.image_url || '',
      }));

      animateLayout();
      setCategories(mappedCategories);
      setCategoriesLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [user, categoriesLoaded, setCategories, setCategoriesLoaded]);

  const create = async (category: Omit<Category, 'id' | 'tenant_id' | 'metric_type' | 'description'>) => {
    if (!user) return null;
    try {
      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.CATEGORIES,
        rowId: ID.unique(),
        data: {
          name: category.name,
          is_active: category.is_active,
          unit_name: category.unit_name || null,
          calc_type: category.calc_type || 'pcs',
          image_url: category.image_url || null,
          tenant_id: user.tenant_id,
        }
      });

      const newCat: Category = {
        id: doc.$id,
        tenant_id: doc.tenant_id,
        name: doc.name || '',
        is_active: doc.is_active !== false,
        unit_name: doc.unit_name || null,
        calc_type: doc.calc_type || 'pcs',
        image_url: doc.image_url || '',
      };

      animateLayout();
      setCategories([...categories, newCat]);
      return newCat;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create category');
    }
  };

  const update = async (id: string, updates: Partial<Category>) => {
    try {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.CATEGORIES,
        rowId: id,
        data: updates
      });

      let updated: Category | null = null;
      const nextCategories = categories.map((c) => {
        if (c.id === id) {
          updated = { ...c, ...updates };
          return updated;
        }
        return c;
      });
      animateLayout();
      setCategories(nextCategories);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update category');
    }
  };

  const remove = async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.CATEGORIES,
        rowId: id
      });
      animateLayout();
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete category');
    }
  };

  return { categories, loading, error, fetch, create, update, remove };
};
