import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { Category } from '../types';

export const useCategories = () => {
  const user = useAuthStore((s) => s.user);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
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

      setCategories(
        response.rows.map((c) => ({
          id: c.$id,
          tenant_id: c.tenant_id,
          name: c.name || '',
          is_active: c.is_active !== false,
          unit_name: c.unit_name || null,
          calc_type: c.calc_type || 'pcs',
          image_url: c.image_url || '',
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [user]);

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

      setCategories((prev) => [...prev, newCat]);
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
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updated = { ...c, ...updates };
            return updated;
          }
          return c;
        })
      );
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
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete category');
    }
  };

  return { categories, loading, error, fetch, create, update, remove };
};
