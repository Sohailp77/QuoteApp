import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { StockMovement } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export const useStockMovements = () => {
  const user = useAuthStore((s) => s.user);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (productId?: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const queries = [
        Query.equal('tenant_id', user.tenant_id),
        Query.orderDesc('$createdAt'),
        Query.limit(200)
      ];
      if (productId) {
        queries.push(Query.equal('product_id', productId));
      }

      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.STOCK_MOVEMENTS,
        queries
      });

      setMovements(
        response.rows.map((m) => ({
          id: m.$id,
          tenant_id: m.tenant_id,
          product_id: m.product_id || '',
          product_name: m.product_name || '',
          movement_type: m.movement_type as any,
          quantity: Number(m.quantity) || 0,
          note: m.note || undefined,
          supplier: m.supplier || undefined,
          created_at: m.$createdAt || new Date().toISOString(),
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock movements');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addMovement = async (movement: Omit<StockMovement, 'id' | 'tenant_id' | 'created_at'>) => {
    if (!user) return null;
    try {
      // 1. Fetch current product to calculate new stock
      const productDoc = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.PRODUCTS,
        rowId: movement.product_id
      });
      
      const currentStock = Number(productDoc.stock_quantity) || 0;
      let newStock = currentStock;

      if (['IN', 'RETURN'].includes(movement.movement_type)) {
        newStock += movement.quantity;
      } else if (['OUT', 'DAMAGE', 'ADJUSTMENT'].includes(movement.movement_type)) {
        newStock -= movement.quantity;
      }

      // 2. Insert movement record
      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.STOCK_MOVEMENTS,
        rowId: ID.unique(),
        data: {
          tenant_id: user.tenant_id,
          product_id: movement.product_id,
          product_name: movement.product_name,
          movement_type: movement.movement_type,
          quantity: movement.quantity,
          note: movement.note,
          supplier: movement.supplier,
        }
      });

      // 3. Update product stock
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.PRODUCTS,
        rowId: movement.product_id,
        data: { stock_quantity: newStock }
      });

      const newMov: StockMovement = {
        id: doc.$id,
        tenant_id: doc.tenant_id,
        product_id: doc.product_id,
        product_name: doc.product_name,
        movement_type: doc.movement_type as any,
        quantity: Number(doc.quantity),
        note: doc.note,
        supplier: doc.supplier,
        created_at: doc.$createdAt,
      };

      setMovements((prev) => [newMov, ...prev]);
      return newMov;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to process stock movement');
    }
  };

  return { movements, loading, error, fetch, addMovement };
};
