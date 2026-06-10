import { useState, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
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
      const q = query(
        collection(db, 'categories'),
        where('tenant_id', '==', user.tenant_id)
      );
      const querySnapshot = await getDocs(q);
      const data: Category[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const docData = docSnapshot.data();
        data.push({
          id: docSnapshot.id,
          user_id: docData.user_id || '',
          name: docData.name || '',
          description: docData.description,
          unit_name: docData.unit_name || 'Pcs',
          metric_type: docData.metric_type || 'fixed',
          is_active: docData.is_active !== false,
          created_at: docData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
      
      // Sort in memory to avoid requiring a Firebase composite index
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setCategories(data);
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
        ...cat,
        user_id: user.id,
        tenant_id: user.tenant_id,
        created_at: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'categories'), newCatData);
      const newCategory: Category = {
        id: docRef.id,
        user_id: user.id,
        name: cat.name,
        description: cat.description,
        unit_name: cat.unit_name || 'Pcs',
        metric_type: cat.metric_type || 'fixed',
        is_active: cat.is_active,
        created_at: new Date().toISOString()
      };
      setCategories((prev) => [newCategory, ...prev]);
      return newCategory;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create category');
    }
  };

  const update = async (id: string, updates: Partial<Category>) => {
    try {
      const categoryRef = doc(db, 'categories', id);
      await updateDoc(categoryRef, updates);
      
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
      const categoryRef = doc(db, 'categories', id);
      await deleteDoc(categoryRef);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete category');
    }
  };

  return { categories, loading, error, fetch, create, update, remove };
};
