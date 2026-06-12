import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { Quote, LineItem } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { animateLayout } from '../utils/animation';

export const useQuotes = () => {
  const user = useAuthStore((s) => s.user);
  const quotes = useAppStore((s) => s.quotes);
  const setQuotes = useAppStore((s) => s.setQuotes);
  const quotesLoaded = useAppStore((s) => s.quotesLoaded);
  const setQuotesLoaded = useAppStore((s) => s.setQuotesLoaded);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (force = false) => {
    if (!user) return;
    if (quotesLoaded && !force) return;
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

      const parsedQuotes = response.rows.map((q) => {
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
      });

      animateLayout();
      setQuotes(parsedQuotes);
      setQuotesLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  }, [user, quotesLoaded, setQuotes, setQuotesLoaded]);

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

      animateLayout();
      setQuotes([newQuote, ...quotes]);
      return newQuote;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create quote');
    }
  }, [user, quotes, setQuotes]);

  const updateStatus = useCallback(async (id: string, status: Quote['status']) => {
    if (!user) return;
    try {
      const currentQuote = quotes.find(q => q.id === id);
      if (!currentQuote) return;

      const previousStatus = currentQuote.status;

      // Handle stock mutations based on status transitions:
      // 1. Transitioning to Accepted -> Decrement stock
      // 2. Transitioning FROM Accepted to something else -> Revert (increment) stock
      const isTransitioningToAccepted = previousStatus !== 'Accepted' && status === 'Accepted';
      const isTransitioningFromAccepted = previousStatus === 'Accepted' && status !== 'Accepted';

      if ((isTransitioningToAccepted || isTransitioningFromAccepted) && currentQuote.items) {
        let localProducts = [...useAppStore.getState().products];
        let localMovements = [...useAppStore.getState().stockMovements];

        for (const item of currentQuote.items) {
          if (item.product_id) {
            // Get latest product data from database to prevent concurrency conflicts
            const prodDoc = await tablesDB.getRow({
              databaseId: DATABASE_ID,
              tableId: COLLECTIONS.PRODUCTS,
              rowId: item.product_id
            });

            if (prodDoc.stock_quantity !== null) {
              const currentStock = Number(prodDoc.stock_quantity) || 0;
              const stockDiff = isTransitioningToAccepted ? -item.quantity : item.quantity;
              const newStock = Math.max(0, currentStock + stockDiff);

              // Update product in Appwrite DB
              await tablesDB.updateRow({
                databaseId: DATABASE_ID,
                tableId: COLLECTIONS.PRODUCTS,
                rowId: item.product_id,
                data: { stock_quantity: newStock }
              });

              // Update product in local state
              localProducts = localProducts.map(p =>
                p.id === item.product_id ? { ...p, stock_quantity: newStock } : p
              );

              // Log stock movement in Appwrite DB
              const movementType = isTransitioningToAccepted ? 'OUT' : 'IN';
              const noteText = isTransitioningToAccepted
                ? `Quote ${currentQuote.quote_number} accepted`
                : `Quote ${currentQuote.quote_number} returned to ${status} (Stock Reverted)`;

              const movDoc = await tablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: COLLECTIONS.STOCK_MOVEMENTS,
                rowId: ID.unique(),
                data: {
                  tenant_id: user.tenant_id,
                  product_id: item.product_id,
                  product_name: item.product_name,
                  movement_type: movementType,
                  quantity: item.quantity,
                  note: noteText,
                }
              });

              // Add stock movement to local state
              const newMov = {
                id: movDoc.$id,
                tenant_id: movDoc.tenant_id,
                product_id: movDoc.product_id,
                product_name: movDoc.product_name,
                movement_type: movDoc.movement_type as any,
                quantity: Number(movDoc.quantity),
                note: movDoc.note,
                created_at: movDoc.$createdAt || new Date().toISOString(),
              };
              localMovements = [newMov, ...localMovements];
            }
          }
        }

        // Apply visual updates to stores
        animateLayout();
        useAppStore.getState().setProducts(localProducts);
        useAppStore.getState().setStockMovements(localMovements);
      }

      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.QUOTES,
        rowId: id,
        data: { status }
      });

      animateLayout();
      setQuotes(
        quotes.map((q) => (q.id === id ? { ...q, status } : q))
      );
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update quote status');
    }
  }, [user, quotes, setQuotes]);

  const updateDetails = useCallback(async (id: string, updates: Partial<Quote>) => {
    try {
      const updatePayload: any = { ...updates };
      
      delete updatePayload.id;
      delete updatePayload.tenant_id;
      delete updatePayload.created_at;

      if (updates.items) {
        updatePayload.items = JSON.stringify(updates.items);
      } else {
        delete updatePayload.items;
      }

      const doc = await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.QUOTES,
        rowId: id,
        data: updatePayload
      });

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

      animateLayout();
      setQuotes(
        quotes.map((q) => (q.id === id ? updated : q))
      );
      
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update quote details');
    }
  }, [quotes, setQuotes]);

  const remove = useCallback(async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.QUOTES,
        rowId: id
      });
      animateLayout();
      setQuotes(quotes.filter((q) => q.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete quote');
    }
  }, [quotes, setQuotes]);

  const fetchById = useCallback(async (id: string): Promise<Quote | null> => {
    if (!user) return null;
    // Try to return from cache first to save DB costs
    const cached = quotes.find(q => q.id === id);
    if (cached) return cached;

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
  }, [user, quotes]);

  return { quotes, loading, error, fetch, fetchById, create, updateStatus, updateQuoteDetails: updateDetails, remove };
};
