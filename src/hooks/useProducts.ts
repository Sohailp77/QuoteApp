import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { Product } from '../types';
import { animateLayout } from '../utils/animation';
import { decodeProductCalcConfig, encodeProductCalcConfig } from '../utils/quantityCalculator';

export const useProducts = () => {
  const user = useAuthStore((s) => s.user);
  const products = useAppStore((s) => s.products);
  const setProducts = useAppStore((s) => s.setProducts);
  const productsLoaded = useAppStore((s) => s.productsLoaded);
  const setProductsLoaded = useAppStore((s) => s.setProductsLoaded);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapProductDoc = (prod: any): Product => {
    const decoded = decodeProductCalcConfig(prod.calc_type);
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
      calc_method: decoded.calc_method,
      input_unit: decoded.input_unit,
      unit_coverage: decoded.unit_coverage,
      rounding_mode: decoded.rounding_mode,
      image_url: prod.image_url || '',
    };
  };

  const fetch = useCallback(async (force = false) => {
    if (!user) return;
    if (productsLoaded && !force) return;
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

      const mappedProducts = response.rows.map(mapProductDoc);

      animateLayout();
      setProducts(mappedProducts);
      setProductsLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [user, productsLoaded, setProducts, setProductsLoaded]);

  const create = async (product: Omit<Product, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return null;
    try {
      const calcTypeEncoded = encodeProductCalcConfig({
        calc_method: product.calc_method,
        input_unit: product.input_unit,
        unit_coverage: product.unit_coverage,
        rounding_mode: product.rounding_mode,
      });

      const payload: any = {
        ...product,
        calc_type: calcTypeEncoded,
        image_url: product.image_url || null,
        tenant_id: user.tenant_id,
        user_id: user.id,
      };

      // Strip non-Appwrite top-level properties before database invocation
      delete payload.calc_method;
      delete payload.input_unit;
      delete payload.unit_coverage;
      delete payload.rounding_mode;

      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.PRODUCTS,
        rowId: ID.unique(),
        data: payload
      });

      const newProduct = mapProductDoc(doc);

      animateLayout();
      setProducts([newProduct, ...products]);
      return newProduct;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create product');
    }
  };

  const update = async (id: string, updates: Partial<Product>) => {
    try {
      const existingProduct = products.find((p) => p.id === id);
      const mergedMethod = updates.calc_method !== undefined ? updates.calc_method : existingProduct?.calc_method;
      const mergedInputUnit = updates.input_unit !== undefined ? updates.input_unit : existingProduct?.input_unit;
      const mergedCoverage = updates.unit_coverage !== undefined ? updates.unit_coverage : existingProduct?.unit_coverage;
      const mergedRounding = updates.rounding_mode !== undefined ? updates.rounding_mode : existingProduct?.rounding_mode;

      const payload: any = { ...updates };

      if (
        updates.calc_method !== undefined ||
        updates.input_unit !== undefined ||
        updates.unit_coverage !== undefined ||
        updates.rounding_mode !== undefined
      ) {
        payload.calc_type = encodeProductCalcConfig({
          calc_method: mergedMethod,
          input_unit: mergedInputUnit,
          unit_coverage: mergedCoverage,
          rounding_mode: mergedRounding,
        });
      }

      delete payload.calc_method;
      delete payload.input_unit;
      delete payload.unit_coverage;
      delete payload.rounding_mode;
      delete payload.id;
      delete payload.created_at;

      const doc = await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.PRODUCTS,
        rowId: id,
        data: payload
      });

      const updated = mapProductDoc(doc);

      const nextProducts = products.map((p) => (p.id === id ? updated : p));
      animateLayout();
      setProducts(nextProducts);
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
      animateLayout();
      setProducts(products.filter((p) => p.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete product');
    }
  };

  const findByBarcode = async (barcode: string): Promise<Product | null> => {
    if (!user || !barcode.trim()) return null;
    
    // First query cache to save database transactions
    const cached = products.find(p => p.barcode === barcode.trim() || p.sku === barcode.trim());
    if (cached) return cached;

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
        return mapProductDoc(response.rows[0]);
      }
      return null;
    } catch {
      return null;
    }
  };

  return { products, loading, error, fetch, create, update, remove, findByBarcode };
};
