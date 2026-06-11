import { useState, useCallback } from 'react';
import { databases, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
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
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.QUOTES,
        [
          Query.equal('tenant_id', user.tenant_id),
          Query.orderDesc('$createdAt'),
          Query.limit(200)
        ]
      );

      setQuotes(
        response.documents.map((q) => {
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

  const create = async (quoteData: Omit<Quote, 'id' | 'user_id' | 'quote_number' | 'created_at' | 'items' | 'tenant_id'>, items: LineItem[]) => {
    if (!user) return null;
    try {
      const quoteNumber = `QT-${Date.now().toString().slice(-6)}`;
      
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.QUOTES,
        ID.unique(),
        {
          ...quoteData,
          items: JSON.stringify(items),
          tenant_id: user.tenant_id,
          user_id: user.id,
          quote_number: quoteNumber,
        }
      );

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
        items,
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
  };

  const updateStatus = async (id: string, status: Quote['status']) => {
    if (!user) return;
    try {
      // 1. If accepting quote, deduct stock via movement
      if (status === 'Accepted') {
        const currentQuote = quotes.find(q => q.id === id);
        if (currentQuote && currentQuote.items) {
          for (const item of currentQuote.items) {
            if (item.product_id) {
              const prodDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, item.product_id);
              const currentStock = Number(prodDoc.stock_quantity) || 0;
              
              // Only deduct if tracking stock (stock_quantity exists)
              if (prodDoc.stock_quantity !== null) {
                await databases.updateDocument(
                  DATABASE_ID,
                  COLLECTIONS.PRODUCTS,
                  item.product_id,
                  { stock_quantity: currentStock - item.quantity }
                );

                // Log movement
                await databases.createDocument(
                  DATABASE_ID,
                  COLLECTIONS.STOCK_MOVEMENTS,
                  ID.unique(),
                  {
                    tenant_id: user.tenant_id,
                    product_id: item.product_id,
                    product_name: item.name,
                    movement_type: 'OUT',
                    quantity: item.quantity,
                    note: `Quote ${currentQuote.quote_number} accepted`,
                  }
                );
              }
            }
          }
        }
      }

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.QUOTES,
        id,
        { status }
      );

      setQuotes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      );
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update quote status');
    }
  };

  const updateDetails = async (id: string, updates: Partial<Quote>) => {
    try {
      const updatePayload: any = { ...updates };
      
      // Don't send arrays or objects directly, Appwrite attributes are specific types
      delete updatePayload.items; 
      delete updatePayload.id;
      delete updatePayload.tenant_id;
      delete updatePayload.created_at;

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.QUOTES,
        id,
        updatePayload
      );

      setQuotes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
      );
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update quote details');
    }
  };

  const remove = async (id: string) => {
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.QUOTES, id);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete quote');
    }
  };

  const fetchById = async (id: string): Promise<Quote | null> => {
    if (!user) return null;
    try {
      const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.QUOTES, id);
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
  };

  return { quotes, loading, error, fetch, fetchById, create, updateStatus, updateQuoteDetails: updateDetails, remove };
};
