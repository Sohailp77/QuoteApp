import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { Reorder, ReorderItem, ReorderStatus } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { useStockMovements } from './useStockMovements';
import { animateLayout } from '../utils/animation';

const REORDERS_TABLE = 'reorders';

export const useReorders = () => {
  const user = useAuthStore((s) => s.user);
  const reorders = useAppStore((s) => s.reorders);
  const setReorders = useAppStore((s) => s.setReorders);
  const reordersLoaded = useAppStore((s) => s.reordersLoaded);
  const setReordersLoaded = useAppStore((s) => s.setReordersLoaded);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addMovement } = useStockMovements();

  const parseReorder = (doc: any): Reorder => {
    let items: ReorderItem[] = [];
    try { items = JSON.parse(doc.items || '[]'); } catch {}
    return {
      id: doc.$id,
      tenant_id: doc.tenant_id,
      order_number: doc.order_number || '',
      vendor_name: doc.vendor_name || '',
      status: doc.status as ReorderStatus || 'Draft',
      items,
      total_paid: Number(doc.total_paid) || 0,
      invoice_number: doc.invoice_number || undefined,
      purchase_date: doc.purchase_date || undefined,
      notes: doc.notes || undefined,
      created_at: doc.$createdAt || new Date().toISOString(),
    };
  };

  const fetch = useCallback(async (force = false) => {
    if (!user) return;
    if (reordersLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: REORDERS_TABLE,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.orderDesc('$createdAt'),
          Query.limit(200),
        ],
      });
      animateLayout();
      setReorders(response.rows.map(parseReorder));
      setReordersLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reorders');
    } finally {
      setLoading(false);
    }
  }, [user, reordersLoaded, setReorders, setReordersLoaded]);

  // Generate an order number like PO-20260901-001
  const generateOrderNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `PO-${dateStr}-${rand}`;
  };

  const createReorder = async (
    vendorName: string,
    items: ReorderItem[],
    notes?: string,
  ): Promise<Reorder | null> => {
    if (!user) return null;
    try {
      const orderNumber = generateOrderNumber();
      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: REORDERS_TABLE,
        rowId: ID.unique(),
        data: {
          tenant_id: user.tenant_id,
          order_number: orderNumber,
          vendor_name: vendorName,
          status: 'Ordered',
          items: JSON.stringify(items),
          total_paid: 0,
          notes: notes || '',
        },
      });
      const newReorder = parseReorder(doc);
      animateLayout();
      setReorders([newReorder, ...reorders]);
      return newReorder;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create reorder');
    }
  };

  const receiveReorder = async (
    reorderId: string,
    receivedItems: { product_id: string; product_name: string; qty: number }[],
    totalPaid: number,
    invoiceNumber?: string,
    purchaseDate?: string,
  ): Promise<void> => {
    if (!user) return;
    const reorder = reorders.find((r) => r.id === reorderId);
    if (!reorder) throw new Error('Reorder not found');

    // 1. Process stock movements for each received item
    for (const item of receivedItems) {
      if (item.qty > 0) {
        await addMovement({
          product_id: item.product_id,
          product_name: item.product_name,
          movement_type: 'IN',
          quantity: item.qty,
          note: `Reorder #${reorder.order_number} Received`,
          supplier: reorder.vendor_name,
        });
      }
    }

    // 2. Determine new status
    const originalItems = reorder.items;
    const allFullyReceived = originalItems.every((oi) => {
      const match = receivedItems.find((ri) => ri.product_id === oi.product_id);
      return match && match.qty >= oi.reorder_quantity;
    });
    const anyReceived = receivedItems.some((ri) => ri.qty > 0);
    const newStatus: ReorderStatus = !anyReceived
      ? 'Ordered'
      : allFullyReceived
      ? 'Received'
      : 'Partially Received';

    // 3. Update reorder doc with received quantities, paid amount, status
    const updatedItems = originalItems.map((oi) => {
      const match = receivedItems.find((ri) => ri.product_id === oi.product_id);
      return { ...oi, received_quantity: (oi.received_quantity || 0) + (match?.qty || 0) };
    });

    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: REORDERS_TABLE,
      rowId: reorderId,
      data: {
        status: newStatus,
        total_paid: totalPaid,
        invoice_number: invoiceNumber || '',
        purchase_date: purchaseDate || '',
        items: JSON.stringify(updatedItems),
      },
    });

    // 4. Update local store
    animateLayout();
    setReorders(
      reorders.map((r) =>
        r.id === reorderId
          ? {
              ...r,
              status: newStatus,
              total_paid: totalPaid,
              invoice_number: invoiceNumber,
              purchase_date: purchaseDate,
              items: updatedItems,
            }
          : r,
      ),
    );
  };

  const updateStatus = async (reorderId: string, status: ReorderStatus) => {
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: REORDERS_TABLE,
      rowId: reorderId,
      data: { status },
    });
    animateLayout();
    setReorders(reorders.map((r) => (r.id === reorderId ? { ...r, status } : r)));
  };

  const remove = async (reorderId: string) => {
    await tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: REORDERS_TABLE,
      rowId: reorderId,
    });
    animateLayout();
    setReorders(reorders.filter((r) => r.id !== reorderId));
  };

  return { reorders, loading, error, fetch, createReorder, receiveReorder, updateStatus, remove };
};
