import { useState, useCallback } from 'react';
import { databases, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
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
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CATEGORIES,
        [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(100)
        ]
      );

      setCategories(
        response.documents.map((c) => ({
          id: c.$id,
          tenant_id: c.tenant_id,
          name: c.name || '',
          is_active: c.is_active !== false,
          unit_name: c.unit_name || null,
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = async (category: Omit<Category, 'id' | 'tenant_id'>) => {
    if (!user) return null;
    try {
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.CATEGORIES,
        ID.unique(),
        {
          name: category.name,
          is_active: category.is_active,
          unit_name: category.unit_name || null,
          tenant_id: user.tenant_id,
        }
      );

      const newCat: Category = {
        id: doc.$id,
        tenant_id: doc.tenant_id,
        name: doc.name || '',
        is_active: doc.is_active !== false,
        unit_name: doc.unit_name || null,
      };

      setCategories((prev) => [...prev, newCat]);
      return newCat;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create category');
    }
  };

  const update = async (id: string, updates: Partial<Category>) => {
    try {
      const doc = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.CATEGORIES,
        id,
        updates
      );

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
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CATEGORIES, id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete category');
    }
  };

  return { categories, loading, error, fetch, create, update, remove };
};
