import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { Customer } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { animateLayout } from '../utils/animation';

export const useCustomers = () => {
  const user = useAuthStore((s) => s.user);
  const customers = useAppStore((s) => s.customers);
  const setCustomers = useAppStore((s) => s.setCustomers);
  const customersLoaded = useAppStore((s) => s.customersLoaded);
  const setCustomersLoaded = useAppStore((s) => s.setCustomersLoaded);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (force = false) => {
    if (!user) return;
    if (customersLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.CUSTOMERS,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(100)
        ]
      });

      const mapped: Customer[] = response.rows.map((c) => ({
        id: c.$id,
        tenant_id: c.tenant_id,
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        billing_address: c.billing_address || '',
        gst_number: c.gst_number || '',
        notes: c.notes || '',
        created_at: c.$createdAt || new Date().toISOString(),
      }));

      mapped.sort((a, b) => a.name.localeCompare(b.name));
      animateLayout();
      setCustomers(mapped);
      setCustomersLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [user, customersLoaded, setCustomers, setCustomersLoaded]);

  const search = async (query: string): Promise<Customer[]> => {
    if (!user || !query.trim()) return [];
    
    // Search within local cache first to prevent database cost!
    const term = query.trim().toLowerCase();
    const cachedMatches = customers.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.email.toLowerCase().includes(term) || 
      c.phone.includes(term)
    );
    if (cachedMatches.length > 0) return cachedMatches.slice(0, 8);

    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.CUSTOMERS,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.search('name', query.trim()),
          Query.limit(8)
        ]
      });

      return response.rows.map((c) => ({
        id: c.$id,
        tenant_id: c.tenant_id,
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        billing_address: c.billing_address || '',
        gst_number: c.gst_number || '',
        notes: c.notes || '',
        created_at: c.$createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  };

  const create = async (customer: Omit<Customer, 'id' | 'tenant_id' | 'created_at'>) => {
    if (!user) return null;
    try {
      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.CUSTOMERS,
        rowId: ID.unique(),
        data: {
          ...customer,
          tenant_id: user.tenant_id,
        }
      });

      const newCustomer: Customer = {
        id: doc.$id,
        tenant_id: doc.tenant_id,
        name: doc.name,
        phone: doc.phone || '',
        email: doc.email || '',
        billing_address: doc.billing_address || '',
        gst_number: doc.gst_number || '',
        notes: doc.notes || '',
        created_at: doc.$createdAt || new Date().toISOString(),
      };

      const list = [newCustomer, ...customers].sort((a, b) => a.name.localeCompare(b.name));
      animateLayout();
      setCustomers(list);
      return newCustomer;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create customer');
    }
  };

  const update = async (id: string, updates: Partial<Customer>) => {
    try {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.CUSTOMERS,
        rowId: id,
        data: updates
      });

      let updated: Customer | null = null;
      const nextCustomers = customers.map((c) => {
        if (c.id === id) {
          updated = { ...c, ...updates };
          return updated;
        }
        return c;
      });
      animateLayout();
      setCustomers(nextCustomers);
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update customer');
    }
  };

  const remove = async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.CUSTOMERS,
        rowId: id
      });
      animateLayout();
      setCustomers(customers.filter((c) => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete customer');
    }
  };

  return { customers, loading, error, fetch, search, create, update, remove };
};
