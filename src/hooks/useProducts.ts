import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { Product } from '../types';

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
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.PRODUCTS,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(500)
        ]
      });

      setProducts(
        response.rows.map((prod) => ({
          id: prod.$id,
          user_id: prod.user_id || '',
          name: prod.name || '',
          description: prod.description || '',
          unit_price: Number(prod.unit_price) || 0,
          cost_price: prod.cost_price !== null ? Number(prod.cost_price) : undefined,
          stock_quantity: prod.stock_quantity !== null ? Number(prod.stock_quantity) : undefined,
          unit: prod.unit || 'Pcs',
          category: prod.category || '',
          sku: prod.sku || '',
          barcode: prod.barcode || '',
          warehouse_location: prod.warehouse_location || '',
          reorder_level: prod.reorder_level !== null ? Number(prod.reorder_level) : undefined,
          created_at: prod.$createdAt || new Date().toISOString(),
          calc_type: prod.calc_type || 'pcs',
          image_url: prod.image_url || '',
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = async (product: Omit<Product, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    try {
      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.PRODUCTS,
        rowId: ID.unique(),
        data: {
          ...product,
          image_url: product.image_url || null,
          tenant_id: user.tenant_id,
          user_id: user.id,
        }
      });

      const newProduct: Product = {
        id: doc.$id,
        user_id: doc.user_id || '',
        name: doc.name || '',
        description: doc.description || '',
        unit_price: Number(doc.unit_price) || 0,
        cost_price: doc.cost_price !== null ? Number(doc.cost_price) : undefined,
        stock_quantity: doc.stock_quantity !== null ? Number(doc.stock_quantity) : undefined,
        unit: doc.unit || 'Pcs',
        category: doc.category || '',
        sku: doc.sku || '',
        barcode: doc.barcode || '',
        warehouse_location: doc.warehouse_location || '',
        reorder_level: doc.reorder_level !== null ? Number(doc.reorder_level) : undefined,
        created_at: doc.$createdAt || new Date().toISOString(),
        calc_type: doc.calc_type || 'pcs',
        image_url: doc.image_url || '',
      };

      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create product');
    }
  };

  const update = async (id: string, updates: Partial<Product>) => {
    try {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.PRODUCTS,
        rowId: id,
        data: updates
      });

      let updated: Product | null = null;
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            updated = { ...p, ...updates };
            return updated;
          }
          return p;
        })
      );
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update product');
    }
  };

  const remove = async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.PRODUCTS,
        rowId: id
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete product');
    }
  };

  const findByBarcode = async (barcode: string): Promise<Product | null> => {
    if (!user || !barcode.trim()) return null;
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.PRODUCTS,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.equal('barcode', barcode.trim()),
          Query.limit(1)
        ]
      });

      if (response.rows.length > 0) {
        const prod = response.rows[0];
        return {
          id: prod.$id,
          user_id: prod.user_id || '',
          name: prod.name || '',
          description: prod.description || '',
          unit_price: Number(prod.unit_price) || 0,
          cost_price: prod.cost_price !== null ? Number(prod.cost_price) : undefined,
          stock_quantity: prod.stock_quantity !== null ? Number(prod.stock_quantity) : undefined,
          unit: prod.unit || 'Pcs',
          category: prod.category || '',
          sku: prod.sku || '',
          barcode: prod.barcode || '',
          warehouse_location: prod.warehouse_location || '',
          reorder_level: prod.reorder_level !== null ? Number(prod.reorder_level) : undefined,
          created_at: prod.$createdAt || new Date().toISOString(),
          calc_type: prod.calc_type || 'pcs',
          image_url: prod.image_url || '',
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  return { products, loading, error, fetch, create, update, remove, findByBarcode };
};
