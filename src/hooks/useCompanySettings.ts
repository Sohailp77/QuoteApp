import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { CompanySettings } from '../types';

export const useCompanySettings = () => {
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.COMPANY_SETTINGS,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(1)
        ]
      });

      if (response.rows.length > 0) {
        const doc = response.rows[0];
        setSettings({
          id: doc.$id,
          tenant_id: doc.tenant_id,
          company_name: doc.company_name || '',
          email: doc.email || '',
          phone: doc.phone || '',
          website: doc.website || '',
          gst_number: doc.gst_number || '',
          address: doc.address || '',
          currency: doc.currency || '₹',
          date_format: doc.date_format || 'DD/MM/YYYY',
          invoice_prefix: doc.invoice_prefix || 'INV-',
          next_invoice_number: Number(doc.next_invoice_number) || 1,
          default_notes: doc.default_notes || '',
          terms_conditions: doc.terms_conditions || '',
          logo_url: doc.logo_url || undefined,
          bank_name: doc.bank_name || '',
          account_number: doc.account_number || '',
          ifsc_code: doc.ifsc_code || '',
        });
      } else {
        setSettings(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch company settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const update = async (updates: Partial<CompanySettings>) => {
    if (!user) return null;
    try {
      let updatedSettings: CompanySettings;
      
      if (settings?.id) {
        // Update existing
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: COLLECTIONS.COMPANY_SETTINGS,
          rowId: settings.id,
          data: updates
        });
        updatedSettings = { ...settings, ...updates } as CompanySettings;
      } else {
        // Create new
        const doc = await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: COLLECTIONS.COMPANY_SETTINGS,
          rowId: ID.unique(),
          data: {
            company_name: 'My Company',
            ...updates,
            tenant_id: user.tenant_id,
          }
        });
        updatedSettings = {
          id: doc.$id,
          tenant_id: doc.tenant_id,
          company_name: doc.company_name || '',
          email: doc.email || '',
          phone: doc.phone || '',
          website: doc.website || '',
          gst_number: doc.gst_number || '',
          address: doc.address || '',
          currency: doc.currency || '₹',
          date_format: doc.date_format || 'DD/MM/YYYY',
          invoice_prefix: doc.invoice_prefix || 'INV-',
          next_invoice_number: Number(doc.next_invoice_number) || 1,
          default_notes: doc.default_notes || '',
          terms_conditions: doc.terms_conditions || '',
          logo_url: doc.logo_url || undefined,
          bank_name: doc.bank_name || '',
          account_number: doc.account_number || '',
          ifsc_code: doc.ifsc_code || '',
        };
      }
      
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update company settings');
    }
  };

  return { settings, loading, error, fetch, update };
};
