import { useState, useCallback } from 'react';
import { databases, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { Customer } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export const useCustomers = () => {
  const user = useAuthStore((s) => s.user);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CUSTOMERS,
        [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(100)
        ]
      );

      const mapped: Customer[] = response.documents.map((c) => ({
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
      setCustomers(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const search = async (query: string): Promise<Customer[]> => {
    if (!user || !query.trim()) return [];
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CUSTOMERS,
        [
          Query.equal('tenant_id', user.tenant_id),
          // Search in name attribute
          Query.search('name', query.trim()),
          Query.limit(8)
        ]
      );

      return response.documents.map((c) => ({
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
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.CUSTOMERS,
        ID.unique(),
        {
          ...customer,
          tenant_id: user.tenant_id,
        }
      );

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

      setCustomers((prev) =>
        [newCustomer, ...prev].sort((a, b) => a.name.localeCompare(b.name))
      );
      return newCustomer;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create customer');
    }
  };

  const update = async (id: string, updates: Partial<Customer>) => {
    try {
      const doc = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.CUSTOMERS,
        id,
        updates
      );

      let updated: Customer | null = null;
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updated = { ...c, ...updates };
            return updated;
          }
          return c;
        })
      );
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update customer');
    }
  };

  const remove = async (id: string) => {
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CUSTOMERS, id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete customer');
    }
  };

  return { customers, loading, error, fetch, search, create, update, remove };
};
