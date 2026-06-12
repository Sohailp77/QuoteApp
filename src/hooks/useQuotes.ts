import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { Quote, LineItem } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export const useQuotes = () => {
  const user = useAuthStore((s) => s.user);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.QUOTES,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.orderDesc('$createdAt'),
          Query.limit(200)
        ]
      });

      setQuotes(
        response.rows.map((q) => {
          let parsedItems: LineItem[] = [];
          try {
            parsedItems = JSON.parse(q.items || '[]');
          } catch {}

          return {
            id: q.$id,
            tenant_id: q.tenant_id,
            user_id: q.user_id || '',
            quote_number: q.quote_number || '',
            client_name: q.client_name || '',
            client_email: q.client_email || '',
            client_phone: q.client_phone || '',
            customer_id: q.customer_id || undefined,
            status: q.status as any,
            subtotal: Number(q.subtotal) || 0,
            discount: Number(q.discount) || 0,
            tax: Number(q.tax) || 0,
            total: Number(q.total) || 0,
            notes: q.notes || '',
            valid_until: q.valid_until || '',
            created_at: q.$createdAt || new Date().toISOString(),
            items: parsedItems,
            payment_status: q.payment_status as any || 'Pending',
            payment_method: q.payment_method || undefined,
            delivery_date: q.delivery_date || undefined,
            delivery_partner: q.delivery_partner || undefined,
            tracking_number: q.tracking_number || undefined,
            delivery_status: q.delivery_status as any || 'Pending',
            delivery_note: q.delivery_note || undefined,
          };
        })
      );
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = useCallback(async (
    quoteData: Omit<Quote, 'id' | 'user_id' | 'quote_number' | 'created_at' | 'items' | 'tenant_id'>,
    items: Omit<LineItem, 'id' | 'quote_id'>[]
  ) => {
    if (!user) return null;
    try {
      const quoteNumber = `QT-${Date.now().toString().slice(-6)}`;
      
      const finalItems: LineItem[] = items.map((i) => ({ ...i, id: ID.unique() }));

      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.QUOTES,
        rowId: ID.unique(),
        data: {
          ...quoteData,
          items: JSON.stringify(finalItems),
          tenant_id: user.tenant_id,
          user_id: user.id,
          quote_number: quoteNumber,
        }
      });

      const newQuote: Quote = {
        id: doc.$id,
        tenant_id: doc.tenant_id,
        user_id: doc.user_id,
        quote_number: doc.quote_number,
        client_name: doc.client_name,
        client_email: doc.client_email,
        client_phone: doc.client_phone,
        customer_id: doc.customer_id,
        status: doc.status as any,
        subtotal: Number(doc.subtotal),
        discount: Number(doc.discount),
        tax: Number(doc.tax),
        total: Number(doc.total),
        notes: doc.notes,
        valid_until: doc.valid_until,
        created_at: doc.$createdAt,
        items: finalItems,
        payment_status: doc.payment_status as any || 'Pending',
        payment_method: doc.payment_method,
        delivery_date: doc.delivery_date,
        delivery_partner: doc.delivery_partner,
        tracking_number: doc.tracking_number,
        delivery_status: doc.delivery_status as any || 'Pending',
        delivery_note: doc.delivery_note,
      };

      setQuotes((prev) => [newQuote, ...prev]);
      return newQuote;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create quote');
    }
  }, [user]);

  const updateStatus = useCallback(async (id: string, status: Quote['status']) => {
    if (!user) return;
    try {
      if (status === 'Accepted') {
        const currentQuote = quotes.find(q => q.id === id);
        if (currentQuote && currentQuote.items) {
          for (const item of currentQuote.items) {
            if (item.product_id) {
              const prodDoc = await tablesDB.getRow({
                databaseId: DATABASE_ID,
                tableId: COLLECTIONS.PRODUCTS,
                rowId: item.product_id
              });
              const currentStock = Number(prodDoc.stock_quantity) || 0;
              
              if (prodDoc.stock_quantity !== null) {
                await tablesDB.updateRow({
                  databaseId: DATABASE_ID,
                  tableId: COLLECTIONS.PRODUCTS,
                  rowId: item.product_id,
                  data: { stock_quantity: currentStock - item.quantity }
                });

                await tablesDB.createRow({
                  databaseId: DATABASE_ID,
                  tableId: COLLECTIONS.STOCK_MOVEMENTS,
                  rowId: ID.unique(),
                  data: {
                    tenant_id: user.tenant_id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    movement_type: 'OUT',
                    quantity: item.quantity,
                    note: `Quote ${currentQuote.quote_number} accepted`,
                  }
                });
              }
            }
          }
        }
      }

      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.QUOTES,
        rowId: id,
        data: { status }
      });

      setQuotes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      );
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update quote status');
    }
  }, [user, quotes]);

  const updateDetails = useCallback(async (id: string, updates: Partial<Quote>) => {
    try {
      const updatePayload: any = { ...updates };
      
      delete updatePayload.items; 
      delete updatePayload.id;
      delete updatePayload.tenant_id;
      delete updatePayload.created_at;

      const doc = await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.QUOTES,
        rowId: id,
        data: updatePayload
      });

      setQuotes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
      );

      let parsedItems: LineItem[] = [];
      try { parsedItems = JSON.parse(doc.items || '[]'); } catch {}

      const updated: Quote = {
        id: doc.$id,
        tenant_id: doc.tenant_id,
        user_id: doc.user_id || '',
        quote_number: doc.quote_number || '',
        client_name: doc.client_name || '',
        client_email: doc.client_email || '',
        client_phone: doc.client_phone || '',
        customer_id: doc.customer_id || undefined,
        status: doc.status as any,
        subtotal: Number(doc.subtotal) || 0,
        discount: Number(doc.discount) || 0,
        tax: Number(doc.tax) || 0,
        total: Number(doc.total) || 0,
        notes: doc.notes || '',
        valid_until: doc.valid_until || '',
        created_at: doc.$createdAt || new Date().toISOString(),
        items: parsedItems,
        payment_status: doc.payment_status as any || 'Pending',
        payment_method: doc.payment_method || undefined,
        delivery_date: doc.delivery_date || undefined,
        delivery_partner: doc.delivery_partner || undefined,
        tracking_number: doc.tracking_number || undefined,
        delivery_status: doc.delivery_status as any || 'Pending',
        delivery_note: doc.delivery_note || undefined,
      };
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update quote details');
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.QUOTES,
        rowId: id
      });
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete quote');
    }
  }, []);

  const fetchById = useCallback(async (id: string): Promise<Quote | null> => {
    if (!user) return null;
    try {
      const doc = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.QUOTES,
        rowId: id
      });
      let parsedItems: LineItem[] = [];
      try { parsedItems = JSON.parse(doc.items || '[]'); } catch {}

      return {
        id: doc.$id,
        tenant_id: doc.tenant_id,
        user_id: doc.user_id || '',
        quote_number: doc.quote_number || '',
        client_name: doc.client_name || '',
        client_email: doc.client_email || '',
        client_phone: doc.client_phone || '',
        customer_id: doc.customer_id || undefined,
        status: doc.status as any,
        subtotal: Number(doc.subtotal) || 0,
        discount: Number(doc.discount) || 0,
        tax: Number(doc.tax) || 0,
        total: Number(doc.total) || 0,
        notes: doc.notes || '',
        valid_until: doc.valid_until || '',
        created_at: doc.$createdAt || new Date().toISOString(),
        items: parsedItems,
        payment_status: doc.payment_status as any || 'Pending',
        payment_method: doc.payment_method || undefined,
        delivery_date: doc.delivery_date || undefined,
        delivery_partner: doc.delivery_partner || undefined,
        tracking_number: doc.tracking_number || undefined,
        delivery_status: doc.delivery_status as any || 'Pending',
        delivery_note: doc.delivery_note || undefined,
      };
    } catch {
      return null;
    }
  }, [user]);

  return { quotes, loading, error, fetch, fetchById, create, updateStatus, updateQuoteDetails: updateDetails, remove };
};
