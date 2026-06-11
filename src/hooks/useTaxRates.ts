import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
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
      const { data, error: fetchError } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('tenant_id', user.tenant_id);

      if (fetchError) throw fetchError;

      const mappedData: TaxRate[] = (data || []).map((tr) => ({
        id: tr.id,
        tenant_id: tr.tenant_id || '',
        name: tr.name || '',
        rate: Number(tr.rate) || 0,
        is_active: tr.is_active !== false,
        created_at: tr.created_at || new Date().toISOString(),
      }));

      mappedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTaxRates(mappedData);
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
        name: rateData.name,
        rate: rateData.rate,
        is_active: rateData.is_active,
        tenant_id: user.tenant_id,
      };

      const { data, error: createError } = await supabase
        .from('tax_rates')
        .insert(newRateData)
        .select()
        .single();

      if (createError) throw createError;

      const newTaxRate: TaxRate = {
        id: data.id,
        tenant_id: data.tenant_id || '',
        name: data.name,
        rate: Number(data.rate) || 0,
        is_active: data.is_active,
        created_at: data.created_at || new Date().toISOString(),
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
      const { error: updateError } = await supabase
        .from('tax_rates')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

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
      const { error: deleteError } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTaxRates((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete tax rate');
    }
  };

  return { taxRates, loading, error, fetch, create, update, remove };
};
