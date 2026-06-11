import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Employee } from '../types';
import { useAuthStore } from '../store/useAuthStore';

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
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', user.tenant_id);

      if (fetchError) throw fetchError;

      const mappedData: Employee[] = (data || []).map((emp) => ({
        id: emp.id,
        user_id: emp.user_id || '',
        tenant_id: emp.tenant_id || '',
        name: emp.name || '',
        email: emp.email || '',
        phone: emp.phone || '',
        role: emp.role || '',
        department: emp.department || '',
        avatar_url: emp.avatar_url || undefined,
        created_at: emp.created_at || new Date().toISOString(),
      }));

      mappedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEmployees(mappedData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const create = async (emp: Omit<Employee, 'id' | 'user_id' | 'created_at' | 'tenant_id'>) => {
    if (!user) return null;
    try {
      const newEmpData = {
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        department: emp.department,
        avatar_url: emp.avatar_url || null,
        user_id: '',
        tenant_id: user.tenant_id,
      };

      const { data, error: createError } = await supabase
        .from('employees')
        .insert(newEmpData)
        .select()
        .single();

      if (createError) throw createError;

      const newEmployee: Employee = {
        id: data.id,
        user_id: data.user_id || '',
        tenant_id: data.tenant_id || '',
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        department: data.department || '',
        avatar_url: data.avatar_url || undefined,
        created_at: data.created_at || new Date().toISOString(),
      };

      setEmployees((prev) => [newEmployee, ...prev]);
      return newEmployee;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create employee');
    }
  };

  const update = async (id: string, updates: Partial<Employee>) => {
    try {
      // Map avatar_url to null if undefined to match DB
      const dbUpdates = { ...updates };
      if ('avatar_url' in dbUpdates && dbUpdates.avatar_url === undefined) {
        dbUpdates.avatar_url = undefined;
      }

      const { error: updateError } = await supabase
        .from('employees')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      let updatedEmployee: Employee | null = null;
      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === id) {
            updatedEmployee = { ...e, ...updates };
            return updatedEmployee;
          }
          return e;
        })
      );
      return updatedEmployee;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update employee');
    }
  };

  const remove = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete employee');
    }
  };

  return { employees, loading, error, fetch, create, update, remove };
};
