import { useState, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
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
      const q = query(
        collection(db, 'quotes'),
        where('tenant_id', '==', user.tenant_id)
      );
      const querySnapshot = await getDocs(q);
      const data: Quote[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const docData = docSnapshot.data();
        data.push({
          id: docSnapshot.id,
          user_id: docData.user_id,
          quote_number: docData.quote_number || '',
          client_name: docData.client_name || '',
          client_email: docData.client_email || '',
          client_phone: docData.client_phone,
          status: docData.status || 'Draft',
          subtotal: Number(docData.subtotal) || 0,
          discount: Number(docData.discount) || 0,
          tax: Number(docData.tax) || 0,
          total: Number(docData.total) || 0,
          notes: docData.notes,
          valid_until: docData.valid_until || '',
          created_at: docData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          items: docData.items || [],
          payment_status: docData.payment_status || 'Pending',
          payment_method: docData.payment_method || '',
          delivery_date: docData.delivery_date || '',
          delivery_partner: docData.delivery_partner || '',
          tracking_number: docData.tracking_number || '',
          delivery_status: docData.delivery_status || 'Pending',
          delivery_note: docData.delivery_note || '',
        });
      });
      
      // Sort in memory to avoid requiring a Firebase composite index
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setQuotes(data);
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
        const prodRef = doc(db, 'products', item.product_id);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const currentStock = Number(prodSnap.data().stock_quantity);
          if (!isNaN(currentStock)) {
            const change = direction === 'deduct' ? -item.quantity : item.quantity;
            await updateDoc(prodRef, {
              stock_quantity: Math.max(0, currentStock + change)
            });
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
      // Generate quote number
      const quoteNumber = `QT-${Date.now().toString().slice(-6)}`;
      
      const newQuoteData = {
        ...quoteData,
        user_id: user.id,
        tenant_id: user.tenant_id,
        quote_number: quoteNumber,
        items: items, // Save items inline inside the quote doc
        created_at: serverTimestamp(),
        payment_status: quoteData.payment_status || 'Pending',
        payment_method: quoteData.payment_method || '',
        delivery_date: quoteData.delivery_date || '',
        delivery_partner: quoteData.delivery_partner || '',
        tracking_number: quoteData.tracking_number || '',
        delivery_status: quoteData.delivery_status || 'Pending',
        delivery_note: quoteData.delivery_note || '',
      };

      const docRef = await addDoc(collection(db, 'quotes'), newQuoteData);
      
      const newQuote: Quote = {
        id: docRef.id,
        user_id: user.id,
        quote_number: quoteNumber,
        client_name: quoteData.client_name,
        client_email: quoteData.client_email,
        client_phone: quoteData.client_phone,
        status: quoteData.status,
        subtotal: quoteData.subtotal,
        discount: quoteData.discount,
        tax: quoteData.tax,
        total: quoteData.total,
        notes: quoteData.notes,
        valid_until: quoteData.valid_until,
        created_at: new Date().toISOString(),
        items: items as QuoteItem[],
        payment_status: quoteData.payment_status || 'Pending',
        payment_method: quoteData.payment_method || '',
        delivery_date: quoteData.delivery_date || '',
        delivery_partner: quoteData.delivery_partner || '',
        tracking_number: quoteData.tracking_number || '',
        delivery_status: quoteData.delivery_status || 'Pending',
        delivery_note: quoteData.delivery_note || '',
      };

      // If initially created as Accepted, deduct stock
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
      const quoteRef = doc(db, 'quotes', id);
      const quoteSnap = await getDoc(quoteRef);
      if (!quoteSnap.exists()) throw new Error('Quote does not exist');
      
      const currentQuoteData = quoteSnap.data();
      const oldStatus = currentQuoteData.status || 'Draft';
      const newStatus = updates.status || oldStatus;
      
      await updateDoc(quoteRef, updates);
      
      // Stock adjustment logic
      const items = currentQuoteData.items || [];
      // 1. Moving TO Accepted (Deduct stock)
      if (newStatus === 'Accepted' && oldStatus !== 'Accepted') {
        await adjustStockForQuoteItems(items, 'deduct');
      }
      // 2. Moving AWAY from Accepted (Revert stock)
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
      const quoteRef = doc(db, 'quotes', id);
      const quoteSnap = await getDoc(quoteRef);
      if (quoteSnap.exists()) {
        const currentQuoteData = quoteSnap.data();
        const oldStatus = currentQuoteData.status || 'Draft';
        // If deleted quote was Accepted, revert its stock deduction
        if (oldStatus === 'Accepted') {
          await adjustStockForQuoteItems(currentQuoteData.items || [], 'revert');
        }
      }
      
      await deleteDoc(quoteRef);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete quote');
    }
  };

  const getById = (id: string) => quotes.find((q) => q.id === id);

  return { quotes, loading, error, fetch, create, updateStatus, updateQuoteDetails, remove, getById };
};
