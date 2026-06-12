import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { TaxRate } from '../types';

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
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.TAX_RATES,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(100)
        ]
      });

      setTaxRates(
        response.rows.map((t) => ({
          id: t.$id,
          tenant_id: t.tenant_id,
          name: t.name || '',
          percentage: Number(t.percentage) || 0,
          is_default: t.is_default !== false,
          is_active: t.is_active !== false,
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tax rates');
    } finally {
      setLoading(false);
    }
  }, [user]);

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

      setTaxRates((prev) => {
        if (newTax.is_default) {
          return [...prev.map(t => ({ ...t, is_default: false })), newTax];
        }
        return [...prev, newTax];
      });
      return newTax;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create tax rate');
    }
  }, [user, taxRates]);

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
      setTaxRates((prev) => {
        const next = prev.map((t) => {
          if (updates.is_default && t.id !== id) return { ...t, is_default: false };
          if (t.id === id) {
            updated = { ...t, ...updates };
            return updated;
          }
          return t;
        });
        return next;
      });
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update tax rate');
    }
  }, [taxRates]);

  const remove = useCallback(async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.TAX_RATES,
        rowId: id
      });
      setTaxRates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete tax rate');
    }
  }, []);

  return { taxRates, loading, error, fetch, create, update, remove };
};
