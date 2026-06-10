import { useState, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/useAuthStore';

export interface TaxRate {
  id: string;
  tenant_id: string;
  name: string;
  rate: number;
  is_active: boolean;
  created_at: string;
}

export const useTaxRates = () => {
  const user = useAuthStore((s) => s.user);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'tax_rates'),
        where('tenant_id', '==', user.tenant_id)
      );
      const querySnapshot = await getDocs(q);
      const data: TaxRate[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const docData = docSnapshot.data();
        data.push({
          id: docSnapshot.id,
          tenant_id: docData.tenant_id || '',
          name: docData.name || '',
          rate: Number(docData.rate) || 0,
          is_active: docData.is_active !== false,
          created_at: docData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
      
      // Sort in memory
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setTaxRates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tax rates');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = async (rateData: Omit<TaxRate, 'id' | 'tenant_id' | 'created_at'>) => {
    if (!user) return null;
    if (user.role !== 'boss') {
      throw new Error('Only the owner (Boss) can create or modify tax slabs.');
    }
    try {
      const newRateData = {
        ...rateData,
        tenant_id: user.tenant_id,
        created_at: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'tax_rates'), newRateData);
      const newTaxRate: TaxRate = {
        id: docRef.id,
        tenant_id: user.tenant_id,
        name: rateData.name,
        rate: rateData.rate,
        is_active: rateData.is_active,
        created_at: new Date().toISOString()
      };
      setTaxRates((prev) => [newTaxRate, ...prev]);
      return newTaxRate;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create tax rate');
    }
  };

  const update = async (id: string, updates: Partial<TaxRate>) => {
    if (!user) return null;
    if (user.role !== 'boss') {
      throw new Error('Only the owner (Boss) can modify tax slabs.');
    }
    try {
      const rateRef = doc(db, 'tax_rates', id);
      await updateDoc(rateRef, updates);
      
      let updatedRate: TaxRate | null = null;
      setTaxRates((prev) => 
        prev.map((r) => {
          if (r.id === id) {
            updatedRate = { ...r, ...updates };
            return updatedRate;
          }
          return r;
        })
      );
      return updatedRate;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update tax rate');
    }
  };

  const remove = async (id: string) => {
    if (!user) return;
    if (user.role !== 'boss') {
      throw new Error('Only the owner (Boss) can delete tax slabs.');
    }
    try {
      const rateRef = doc(db, 'tax_rates', id);
      await deleteDoc(rateRef);
      setTaxRates((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete tax rate');
    }
  };

  return { taxRates, loading, error, fetch, create, update, remove };
};
