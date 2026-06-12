import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { TaxRate } from '../types';
import { animateLayout } from '../utils/animation';

export const useTaxRates = () => {
  const user = useAuthStore((s) => s.user);
  const taxRates = useAppStore((s) => s.taxRates);
  const setTaxRates = useAppStore((s) => s.setTaxRates);
  const taxRatesLoaded = useAppStore((s) => s.taxRatesLoaded);
  const setTaxRatesLoaded = useAppStore((s) => s.setTaxRatesLoaded);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (force = false) => {
    if (!user) return;
    if (taxRatesLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.TAX_RATES,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(100)
        ]
      });

      const mappedTaxRates = response.rows.map((t) => ({
        id: t.$id,
        tenant_id: t.tenant_id,
        name: t.name || '',
        percentage: Number(t.percentage) || 0,
        is_default: t.is_default !== false,
        is_active: t.is_active !== false,
      }));

      animateLayout();
      setTaxRates(mappedTaxRates);
      setTaxRatesLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tax rates');
    } finally {
      setLoading(false);
    }
  }, [user, taxRatesLoaded, setTaxRates, setTaxRatesLoaded]);

  const create = useCallback(async (taxRate: Omit<TaxRate, 'id' | 'tenant_id'>) => {
    if (!user) return null;
    try {
      if (taxRate.is_default) {
        const existingDefaults = taxRates.filter(t => t.is_default);
        for (const ed of existingDefaults) {
          await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.TAX_RATES,
            rowId: ed.id,
            data: { is_default: false }
          });
        }
      }

      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.TAX_RATES,
        rowId: ID.unique(),
        data: {
          name: taxRate.name,
          percentage: taxRate.percentage,
          is_default: taxRate.is_default,
          is_active: taxRate.is_active,
          tenant_id: user.tenant_id,
        }
      });

      const newTax: TaxRate = {
        id: doc.$id,
        tenant_id: doc.tenant_id,
        name: doc.name || '',
        percentage: Number(doc.percentage) || 0,
        is_default: doc.is_default !== false,
        is_active: doc.is_active !== false,
      };

      const list = newTax.is_default 
        ? [...taxRates.map(t => ({ ...t, is_default: false })), newTax]
        : [...taxRates, newTax];
      animateLayout();
      setTaxRates(list);
      return newTax;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create tax rate');
    }
  }, [user, taxRates, setTaxRates]);

  const update = useCallback(async (id: string, updates: Partial<TaxRate>) => {
    try {
      if (updates.is_default) {
        const existingDefaults = taxRates.filter(t => t.is_default && t.id !== id);
        for (const ed of existingDefaults) {
          await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.TAX_RATES,
            rowId: ed.id,
            data: { is_default: false }
          });
        }
      }

      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.TAX_RATES,
        rowId: id,
        data: updates
      });

      let updated: TaxRate | null = null;
      const nextTaxRates = taxRates.map((t) => {
        if (updates.is_default && t.id !== id) return { ...t, is_default: false };
        if (t.id === id) {
          updated = { ...t, ...updates };
          return updated;
        }
        return t;
      });
      animateLayout();
      setTaxRates(nextTaxRates);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update tax rate');
    }
  }, [taxRates, setTaxRates]);

  const remove = useCallback(async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.TAX_RATES,
        rowId: id
      });
      animateLayout();
      setTaxRates(taxRates.filter((t) => t.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete tax rate');
    }
  }, [taxRates, setTaxRates]);

  return { taxRates, loading, error, fetch, create, update, remove };
};
