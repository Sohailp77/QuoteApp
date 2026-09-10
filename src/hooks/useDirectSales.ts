import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { DirectSale } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { animateLayout } from '../utils/animation';

const parseDirectSale = (d: any): DirectSale => {
  let items = [];
  try {
    items = typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || []);
  } catch (e) {
    items = [];
  }

  return {
    id: d.$id,
    tenant_id: d.tenant_id,
    sale_number: d.sale_number || '',
    customer_name: d.customer_name || '',
    customer_phone: d.customer_phone || '',
    user_id: d.user_id || '',
    created_by_name: d.created_by_name || '',
    created_by_role: d.created_by_role || '',
    items,
    subtotal: d.subtotal || 0,
    discount: d.discount || 0,
    tax: d.tax || 0,
    total: d.total || 0,
    payment_method: d.payment_method || '',
    payment_status: d.payment_status || 'Pending',
    notes: d.notes || '',
    created_at: d.$createdAt || new Date().toISOString(),
  };
};

export const useDirectSales = () => {
  const user = useAuthStore((s) => s.user);
  const directSales = useAppStore((s) => s.directSales);
  const setDirectSales = useAppStore((s) => s.setDirectSales);
  const directSalesLoaded = useAppStore((s) => s.directSalesLoaded);
  const setDirectSalesLoaded = useAppStore((s) => s.setDirectSalesLoaded);
  const products = useAppStore((s) => s.products);
  const setProducts = useAppStore((s) => s.setProducts);
  const stockMovements = useAppStore((s) => s.stockMovements);
  const setStockMovements = useAppStore((s) => s.setStockMovements);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (force = false) => {
    if (!user) return;
    if (directSalesLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.DIRECT_SALES,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      });

      const mapped: DirectSale[] = response.rows.map(parseDirectSale);
      animateLayout();
      setDirectSales(mapped);
      setDirectSalesLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch direct sales');
    } finally {
      setLoading(false);
    }
  }, [user, directSalesLoaded, setDirectSales, setDirectSalesLoaded]);

  const create = async (data: Omit<DirectSale, 'id' | 'tenant_id' | 'created_at' | 'sale_number'>) => {
    if (!user) return null;
    try {
      const timestamp = new Date().getTime().toString();
      const last6 = timestamp.slice(-6);
      const sale_number = `DS-${last6}`;

      const itemsStr = JSON.stringify(data.items);

      const createdByName = data.created_by_name || user.displayName || user.email || 'Staff';
      const createdByRole = data.created_by_role || (user.role === 'boss' ? 'Business Owner' : 'Employee');

      const payload: any = {
        ...data,
        items: itemsStr,
        sale_number,
        tenant_id: user.tenant_id,
        user_id: user.id,
        created_by_name: createdByName,
        created_by_role: createdByRole,
      };

      let doc;
      try {
        doc = await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: COLLECTIONS.DIRECT_SALES,
          rowId: ID.unique(),
          data: payload
        });
      } catch (dbErr: any) {
        // Fallback if Appwrite attributes for seller info are not created in schema yet
        if (dbErr.message?.toLowerCase().includes('created_by') || dbErr.message?.toLowerCase().includes('user_id')) {
          delete payload.user_id;
          delete payload.created_by_name;
          delete payload.created_by_role;
          doc = await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.DIRECT_SALES,
            rowId: ID.unique(),
            data: payload
          });
        } else {
          throw dbErr;
        }
      }

      const newSale = parseDirectSale(doc);
      // Ensure in-memory state retains seller info even if DB fallback stripped it
      if (!newSale.created_by_name) {
        newSale.created_by_name = createdByName;
        newSale.created_by_role = createdByRole;
        newSale.user_id = user.id;
      }
      
      // Handle stock deductions safely
      let updatedProducts = [...products];
      let newMovements = [...stockMovements];
      let hasStockUpdates = false;

      for (const item of data.items) {
        if (item.product_id) {
          const product = updatedProducts.find(p => p.id === item.product_id);
          if (product && product.stock_quantity !== undefined && product.stock_quantity !== null) {
            const currentStock = Number(product.stock_quantity) || 0;
            const itemQty = Math.max(1, Math.round(Number(item.quantity) || 1));
            // Ensure stock_quantity stays within valid Appwrite integer bounds [0, 999999]
            const newStock = Math.max(0, Math.min(999999, Math.round(currentStock - itemQty)));
            
            try {
              // Update product stock in DB
              await tablesDB.updateRow({
                databaseId: DATABASE_ID,
                tableId: COLLECTIONS.PRODUCTS,
                rowId: product.id,
                data: { stock_quantity: newStock }
              });

              product.stock_quantity = newStock;
              hasStockUpdates = true;
            } catch (stockErr: any) {
              console.warn('Failed to update product stock_quantity in DB:', stockErr);
            }

            try {
              // Create stock movement record
              const movementDoc = await tablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: COLLECTIONS.STOCK_MOVEMENTS,
                rowId: ID.unique(),
                data: {
                  tenant_id: user.tenant_id,
                  product_id: product.id,
                  product_name: product.name,
                  movement_type: 'OUT',
                  quantity: itemQty,
                  note: `Direct Sale #${sale_number}`
                }
              });

              newMovements = [{
                id: movementDoc.$id,
                tenant_id: movementDoc.tenant_id,
                product_id: movementDoc.product_id,
                product_name: movementDoc.product_name,
                movement_type: movementDoc.movement_type,
                quantity: Number(movementDoc.quantity) || itemQty,
                note: movementDoc.note,
                supplier: movementDoc.supplier,
                created_at: movementDoc.$createdAt,
              }, ...newMovements];
            } catch (movErr: any) {
              console.warn('Failed to create stock movement record in DB:', movErr);
            }
          }
        }
      }

      const list = [newSale, ...directSales];
      animateLayout();
      setDirectSales(list);
      
      if (hasStockUpdates) {
        setProducts(updatedProducts);
        setStockMovements(newMovements);
      }

      return newSale;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create direct sale');
    }
  };

  const remove = async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.DIRECT_SALES,
        rowId: id
      });
      animateLayout();
      setDirectSales(directSales.filter((d) => d.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete direct sale');
    }
  };

  return { directSales, loading, error, fetch, create, remove };
};
