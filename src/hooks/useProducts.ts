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
import { Product } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export const useProducts = () => {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'products'),
        where('tenant_id', '==', user.tenant_id)
      );
      const querySnapshot = await getDocs(q);
      const data: Product[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const docData = docSnapshot.data();
        data.push({
          id: docSnapshot.id,
          user_id: docData.user_id || '',
          name: docData.name || '',
          description: docData.description || '',
          unit_price: Number(docData.unit_price) || 0,
          cost_price: docData.cost_price !== undefined ? Number(docData.cost_price) : undefined,
          stock_quantity: docData.stock_quantity !== undefined ? Number(docData.stock_quantity) : undefined,
          unit: docData.unit || 'Pcs',
          category: docData.category || '',
          sku: docData.sku || '',
          created_at: docData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
      
      // Sort in memory to avoid requiring a Firebase composite index
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = async (prod: Omit<Product, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    try {
      const newProdData = {
        ...prod,
        user_id: user.id,
        tenant_id: user.tenant_id,
        created_at: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'products'), newProdData);
      const newProduct: Product = {
        id: docRef.id,
        user_id: user.id,
        name: prod.name,
        description: prod.description,
        unit_price: prod.unit_price,
        cost_price: prod.cost_price,
        stock_quantity: prod.stock_quantity,
        unit: prod.unit,
        category: prod.category,
        sku: prod.sku,
        created_at: new Date().toISOString()
      };
      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create product');
    }
  };

  const update = async (id: string, updates: Partial<Product>) => {
    try {
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, updates);
      
      let updatedProduct: Product | null = null;
      setProducts((prev) => 
        prev.map((p) => {
          if (p.id === id) {
            updatedProduct = { ...p, ...updates };
            return updatedProduct;
          }
          return p;
        })
      );
      return updatedProduct;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update product');
    }
  };

  const remove = async (id: string) => {
    try {
      const productRef = doc(db, 'products', id);
      await deleteDoc(productRef);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete product');
    }
  };

  return { products, loading, error, fetch, create, update, remove };
};
