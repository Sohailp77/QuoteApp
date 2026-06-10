import { useState, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
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
      // Fetch employees belonging to the same tenant (business group)
      const q = query(
        collection(db, 'employees'),
        where('tenant_id', '==', user.tenant_id)
      );
      const querySnapshot = await getDocs(q);
      const data: Employee[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const docData = docSnapshot.data();
        data.push({
          id: docSnapshot.id,
          user_id: docData.user_id || '',
          tenant_id: docData.tenant_id || '',
          name: docData.name || '',
          email: docData.email || '',
          phone: docData.phone || '',
          role: docData.role || '',
          department: docData.department || '',
          avatar_url: docData.avatar_url,
          created_at: docData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
      
      // Sort in memory to avoid requiring a Firebase composite index
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setEmployees(data);
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
        ...emp,
        user_id: '', // Blank initially, populated when they log in
        tenant_id: user.tenant_id,
        created_at: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'employees'), newEmpData);
      const newEmployee: Employee = {
        id: docRef.id,
        user_id: '',
        tenant_id: user.tenant_id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        department: emp.department,
        avatar_url: emp.avatar_url,
        created_at: new Date().toISOString()
      };
      setEmployees((prev) => [newEmployee, ...prev]);
      return newEmployee;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create employee');
    }
  };

  const update = async (id: string, updates: Partial<Employee>) => {
    try {
      const employeeRef = doc(db, 'employees', id);
      await updateDoc(employeeRef, updates);
      
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
      const employeeRef = doc(db, 'employees', id);
      await deleteDoc(employeeRef);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete employee');
    }
  };

  return { employees, loading, error, fetch, create, update, remove };
};
