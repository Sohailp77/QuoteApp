import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Quote, QuoteItem } from '../types';
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
      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('tenant_id', user.tenant_id);

      if (fetchError) throw fetchError;

      const mappedData: Quote[] = (data || []).map((docData) => ({
        id: docData.id,
        user_id: docData.user_id,
        quote_number: docData.quote_number || '',
        client_name: docData.client_name || '',
        client_email: docData.client_email || '',
        client_phone: docData.client_phone || '',
        status: docData.status || 'Draft',
        subtotal: Number(docData.subtotal) || 0,
        discount: Number(docData.discount) || 0,
        tax: Number(docData.tax) || 0,
        total: Number(docData.total) || 0,
        notes: docData.notes || '',
        valid_until: docData.valid_until || '',
        created_at: docData.created_at || new Date().toISOString(),
        items: Array.isArray(docData.items) ? docData.items : [],
        payment_status: docData.payment_status || 'Pending',
        payment_method: docData.payment_method || '',
        delivery_date: docData.delivery_date || '',
        delivery_partner: docData.delivery_partner || '',
        tracking_number: docData.tracking_number || '',
        delivery_status: docData.delivery_status || 'Pending',
        delivery_note: docData.delivery_note || '',
      }));

      mappedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setQuotes(mappedData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const adjustStockForQuoteItems = async (items: QuoteItem[], direction: 'deduct' | 'revert') => {
    for (const item of items) {
      if (!item.product_id) continue;
      try {
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .maybeSingle();

        if (prodError) throw prodError;

        if (prodData) {
          const currentStock = Number(prodData.stock_quantity);
          if (!isNaN(currentStock)) {
            const change = direction === 'deduct' ? -item.quantity : item.quantity;
            const newStock = Math.max(0, currentStock + change);
            const { error: updateError } = await supabase
              .from('products')
              .update({ stock_quantity: newStock })
              .eq('id', item.product_id);

            if (updateError) throw updateError;
          }
        }
      } catch (err) {
        console.error('Failed to adjust stock for product:', item.product_id, err);
      }
    }
  };

  const create = async (
    quoteData: Omit<Quote, 'id' | 'user_id' | 'created_at' | 'quote_number' | 'items'>,
    items: Omit<QuoteItem, 'id' | 'quote_id'>[]
  ) => {
    if (!user) return null;
    try {
      const quoteNumber = `QT-${Date.now().toString().slice(-6)}`;
      const newQuoteData = {
        user_id: user.id,
        tenant_id: user.tenant_id,
        quote_number: quoteNumber,
        client_name: quoteData.client_name,
        client_email: quoteData.client_email,
        client_phone: quoteData.client_phone || '',
        status: quoteData.status,
        subtotal: quoteData.subtotal,
        discount: quoteData.discount,
        tax: quoteData.tax,
        total: quoteData.total,
        notes: quoteData.notes || '',
        valid_until: quoteData.valid_until,
        items: items,
        payment_status: quoteData.payment_status || 'Pending',
        payment_method: quoteData.payment_method || '',
        delivery_date: quoteData.delivery_date || '',
        delivery_partner: quoteData.delivery_partner || '',
        tracking_number: quoteData.tracking_number || '',
        delivery_status: quoteData.delivery_status || 'Pending',
        delivery_note: quoteData.delivery_note || '',
      };

      const { data, error: createError } = await supabase
        .from('quotes')
        .insert(newQuoteData)
        .select()
        .single();

      if (createError) throw createError;

      const newQuote: Quote = {
        id: data.id,
        user_id: data.user_id,
        quote_number: data.quote_number,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone || '',
        status: data.status,
        subtotal: Number(data.subtotal) || 0,
        discount: Number(data.discount) || 0,
        tax: Number(data.tax) || 0,
        total: Number(data.total) || 0,
        notes: data.notes || '',
        valid_until: data.valid_until || '',
        created_at: data.created_at || new Date().toISOString(),
        items: Array.isArray(data.items) ? data.items : [],
        payment_status: data.payment_status || 'Pending',
        payment_method: data.payment_method || '',
        delivery_date: data.delivery_date || '',
        delivery_partner: data.delivery_partner || '',
        tracking_number: data.tracking_number || '',
        delivery_status: data.delivery_status || 'Pending',
        delivery_note: data.delivery_note || '',
      };

      if (quoteData.status === 'Accepted') {
        await adjustStockForQuoteItems(items as QuoteItem[], 'deduct');
      }

      setQuotes((prev) => [newQuote, ...prev]);
      return newQuote;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create quote');
    }
  };

  const updateQuoteDetails = async (id: string, updates: Partial<Quote>) => {
    try {
      const { data: currentQuoteData, error: getError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (getError || !currentQuoteData) throw new Error('Quote does not exist');

      const oldStatus = currentQuoteData.status || 'Draft';
      const newStatus = updates.status || oldStatus;

      const { error: updateError } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      const items = Array.isArray(currentQuoteData.items) ? currentQuoteData.items : [];
      if (newStatus === 'Accepted' && oldStatus !== 'Accepted') {
        await adjustStockForQuoteItems(items, 'deduct');
      }
      if (oldStatus === 'Accepted' && newStatus !== 'Accepted') {
        await adjustStockForQuoteItems(items, 'revert');
      }

      let updatedQuote: Quote | null = null;
      setQuotes((prev) =>
        prev.map((q) => {
          if (q.id === id) {
            updatedQuote = { ...q, ...updates };
            return updatedQuote;
          }
          return q;
        })
      );
      return updatedQuote;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update quote details');
    }
  };

  const updateStatus = async (id: string, status: Quote['status']) => {
    return updateQuoteDetails(id, { status });
  };

  const remove = async (id: string) => {
    try {
      const { data: currentQuoteData, error: getError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (currentQuoteData) {
        const oldStatus = currentQuoteData.status || 'Draft';
        if (oldStatus === 'Accepted') {
          const items = Array.isArray(currentQuoteData.items) ? currentQuoteData.items : [];
          await adjustStockForQuoteItems(items, 'revert');
        }
      }

      const { error: deleteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete quote');
    }
  };

  const getById = (id: string) => quotes.find((q) => q.id === id);

  const fetchById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        const q: Quote = {
          id: data.id,
          user_id: data.user_id,
          quote_number: data.quote_number || '',
          client_name: data.client_name || '',
          client_email: data.client_email || '',
          client_phone: data.client_phone || '',
          status: data.status || 'Draft',
          subtotal: Number(data.subtotal) || 0,
          discount: Number(data.discount) || 0,
          tax: Number(data.tax) || 0,
          total: Number(data.total) || 0,
          notes: data.notes || '',
          valid_until: data.valid_until || '',
          created_at: data.created_at || new Date().toISOString(),
          items: Array.isArray(data.items) ? data.items : [],
          payment_status: data.payment_status || 'Pending',
          payment_method: data.payment_method || '',
          delivery_date: data.delivery_date || '',
          delivery_partner: data.delivery_partner || '',
          tracking_number: data.tracking_number || '',
          delivery_status: data.delivery_status || 'Pending',
          delivery_note: data.delivery_note || '',
        };
        return q;
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quote');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { quotes, loading, error, fetch, create, updateStatus, updateQuoteDetails, remove, getById, fetchById };
};
