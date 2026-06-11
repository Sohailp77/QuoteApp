import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Category } from '../types';
import { useAuthStore } from '../store/useAuthStore';

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
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', user.tenant_id);

      if (fetchError) throw fetchError;

      const mappedData: Category[] = (data || []).map((cat) => ({
        id: cat.id,
        user_id: cat.user_id || '',
        name: cat.name || '',
        description: cat.description || '',
        unit_name: cat.unit_name || 'Pcs',
        metric_type: cat.metric_type || 'fixed',
        is_active: cat.is_active !== false,
        created_at: cat.created_at || new Date().toISOString(),
      }));

      mappedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setCategories(mappedData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = async (cat: Omit<Category, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    try {
      const newCatData = {
        name: cat.name,
        description: cat.description || '',
        unit_name: cat.unit_name || 'Pcs',
        metric_type: cat.metric_type || 'fixed',
        is_active: cat.is_active,
        user_id: user.id,
        tenant_id: user.tenant_id,
      };

      const { data, error: createError } = await supabase
        .from('categories')
        .insert(newCatData)
        .select()
        .single();

      if (createError) throw createError;

      const newCategory: Category = {
        id: data.id,
        user_id: data.user_id || '',
        name: data.name,
        description: data.description || '',
        unit_name: data.unit_name || 'Pcs',
        metric_type: data.metric_type || 'fixed',
        is_active: data.is_active,
        created_at: data.created_at || new Date().toISOString(),
      };

      setCategories((prev) => [newCategory, ...prev]);
      return newCategory;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create category');
    }
  };

  const update = async (id: string, updates: Partial<Category>) => {
    try {
      const { error: updateError } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      let updatedCategory: Category | null = null;
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updatedCategory = { ...c, ...updates };
            return updatedCategory;
          }
          return c;
        })
      );
      return updatedCategory;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update category');
    }
  };

  const remove = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete category');
    }
  };

  return { categories, loading, error, fetch, create, update, remove };
};
