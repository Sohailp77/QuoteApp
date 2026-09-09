import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { Vendor } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { animateLayout } from '../utils/animation';

const parseVendor = (v: any): Vendor => ({
  id: v.$id,
  tenant_id: v.tenant_id,
  name: v.name || '',
  contact_person: v.contact_person || '',
  phone: v.phone || '',
  email: v.email || '',
  address: v.address || '',
  gst_number: v.gst_number || '',
  notes: v.notes || '',
  is_active: v.is_active !== false,
  created_at: v.$createdAt || new Date().toISOString(),
});

export const useVendors = () => {
  const user = useAuthStore((s) => s.user);
  const vendors = useAppStore((s) => s.vendors);
  const setVendors = useAppStore((s) => s.setVendors);
  const vendorsLoaded = useAppStore((s) => s.vendorsLoaded);
  const setVendorsLoaded = useAppStore((s) => s.setVendorsLoaded);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (force = false) => {
    if (!user) return;
    if (vendorsLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.VENDORS,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(100)
        ]
      });

      const mapped: Vendor[] = response.rows.map(parseVendor);
      mapped.sort((a, b) => a.name.localeCompare(b.name));
      animateLayout();
      setVendors(mapped);
      setVendorsLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }, [user, vendorsLoaded, setVendors, setVendorsLoaded]);

  const create = async (vendor: Omit<Vendor, 'id' | 'tenant_id' | 'created_at'>) => {
    if (!user) return null;
    try {
      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.VENDORS,
        rowId: ID.unique(),
        data: {
          ...vendor,
          tenant_id: user.tenant_id,
        }
      });

      const newVendor = parseVendor(doc);
      const list = [newVendor, ...vendors].sort((a, b) => a.name.localeCompare(b.name));
      animateLayout();
      setVendors(list);
      return newVendor;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create vendor');
    }
  };

  const update = async (id: string, updates: Partial<Vendor>) => {
    try {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.VENDORS,
        rowId: id,
        data: updates
      });

      let updated: Vendor | null = null;
      const nextVendors = vendors.map((v) => {
        if (v.id === id) {
          updated = { ...v, ...updates };
          return updated;
        }
        return v;
      });
      animateLayout();
      setVendors(nextVendors);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update vendor');
    }
  };

  const remove = async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.VENDORS,
        rowId: id
      });
      animateLayout();
      setVendors(vendors.filter((v) => v.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete vendor');
    }
  };

  return { vendors, loading, error, fetch, create, update, remove };
};
