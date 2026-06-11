import { useState, useCallback } from 'react';
import { databases, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
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
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.TAX_RATES,
        [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(100)
        ]
      );

      setTaxRates(
        response.documents.map((t) => ({
          id: t.$id,
          tenant_id: t.tenant_id,
          name: t.name || '',
          percentage: Number(t.percentage) || 0,
          is_default: t.is_default !== false, // default true if missing for logic, but usually explicit
          is_active: t.is_active !== false,
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tax rates');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = async (taxRate: Omit<TaxRate, 'id' | 'tenant_id'>) => {
    if (!user) return null;
    try {
      // If new one is default, we should ideally unset others.
      // But we'll just handle it simply here.
      if (taxRate.is_default) {
        // Find existing default and unset it
        const existingDefaults = taxRates.filter(t => t.is_default);
        for (const ed of existingDefaults) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.TAX_RATES, ed.id, { is_default: false });
        }
      }

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.TAX_RATES,
        ID.unique(),
        {
          name: taxRate.name,
          percentage: taxRate.percentage,
          is_default: taxRate.is_default,
          is_active: taxRate.is_active,
          tenant_id: user.tenant_id,
        }
      );

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
  };

  const update = async (id: string, updates: Partial<TaxRate>) => {
    try {
      if (updates.is_default) {
        const existingDefaults = taxRates.filter(t => t.is_default && t.id !== id);
        for (const ed of existingDefaults) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.TAX_RATES, ed.id, { is_default: false });
        }
      }

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.TAX_RATES,
        id,
        updates
      );

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
  };

  const remove = async (id: string) => {
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TAX_RATES, id);
      setTaxRates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete tax rate');
    }
  };

  return { taxRates, loading, error, fetch, create, update, remove };
};
