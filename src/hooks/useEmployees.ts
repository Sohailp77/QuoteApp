import { useState, useCallback } from 'react';
import { tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { Employee } from '../types';

export const useEmployees = () => {
  const user = useAuthStore((s) => s.user);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.EMPLOYEES,
        queries: [
          Query.equal('tenant_id', user.tenant_id),
          Query.limit(100)
        ]
      });

      const mapped: Employee[] = response.rows.map((e) => ({
        id: e.$id,
        user_id: e.user_id || '',
        tenant_id: e.tenant_id,
        name: e.name || '',
        email: e.email || '',
        phone: e.phone || '',
        role: e.role || 'employee',
        department: e.department || '',
        status: e.status || 'Active',
        joined_date: e.joined_date || '',
      }));
      setEmployees(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = useCallback(async (employee: Omit<Employee, 'id' | 'tenant_id' | 'user_id' | 'joined_date' | 'status'>) => {
    if (!user) return null;
    try {
      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.EMPLOYEES,
        rowId: ID.unique(),
        data: {
          ...employee,
          status: 'Active',
          tenant_id: user.tenant_id,
        }
      });

      const newEmp: Employee = {
        id: doc.$id,
        user_id: doc.user_id || '',
        tenant_id: doc.tenant_id,
        name: doc.name || '',
        email: doc.email || '',
        phone: doc.phone || '',
        role: doc.role || 'employee',
        department: doc.department || '',
        status: doc.status || 'Active',
        joined_date: doc.joined_date || '',
      };
      setEmployees((prev) => [...prev, newEmp]);
      return newEmp;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create employee');
    }
  }, [user]);

  const update = useCallback(async (id: string, updates: Partial<Employee>) => {
    try {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.EMPLOYEES,
        rowId: id,
        data: updates
      });
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update employee');
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.EMPLOYEES,
        rowId: id
      });
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete employee');
    }
  }, []);

  return { employees, loading, error, fetch, create, update, remove };
};
