import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
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
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', user.tenant_id);

      if (fetchError) throw fetchError;

      const mappedData: Product[] = (data || []).map((prod) => ({
        id: prod.id,
        user_id: prod.user_id || '',
        name: prod.name || '',
        description: prod.description || '',
        unit_price: Number(prod.unit_price) || 0,
        cost_price: prod.cost_price !== null && prod.cost_price !== undefined ? Number(prod.cost_price) : undefined,
        stock_quantity: prod.stock_quantity !== null && prod.stock_quantity !== undefined ? Number(prod.stock_quantity) : undefined,
        barcode: prod.barcode || '',
        warehouse_location: prod.warehouse_location || '',
        unit: prod.unit || 'Pcs',
        category: prod.category || '',
        sku: prod.sku || '',
        created_at: prod.created_at || new Date().toISOString(),
      }));

      mappedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setProducts(mappedData);
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
        name: prod.name,
        description: prod.description,
        unit_price: prod.unit_price,
        cost_price: prod.cost_price !== undefined ? prod.cost_price : null,
        stock_quantity: prod.stock_quantity !== undefined ? prod.stock_quantity : null,
        unit: prod.unit,
        category: prod.category,
        sku: prod.sku,
        barcode: prod.barcode || '',
        warehouse_location: prod.warehouse_location || '',
        user_id: user.id,
        tenant_id: user.tenant_id,
      };

      const { data, error: createError } = await supabase
        .from('products')
        .insert(newProdData)
        .select()
        .single();

      if (createError) throw createError;

      const newProduct: Product = {
        id: data.id,
        user_id: data.user_id || '',
        name: data.name,
        description: data.description || '',
        unit_price: Number(data.unit_price) || 0,
        cost_price: data.cost_price !== null && data.cost_price !== undefined ? Number(data.cost_price) : undefined,
        stock_quantity: data.stock_quantity !== null && data.stock_quantity !== undefined ? Number(data.stock_quantity) : undefined,
        unit: data.unit || 'Pcs',
        category: data.category || '',
        sku: data.sku || '',
        barcode: data.barcode || '',
        warehouse_location: data.warehouse_location || '',
        created_at: data.created_at || new Date().toISOString(),
      };

      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create product');
    }
  };

  const update = async (id: string, updates: Partial<Product>) => {
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

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
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete product');
    }
  };

  return { products, loading, error, fetch, create, update, remove };
};
