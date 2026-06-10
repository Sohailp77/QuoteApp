import { useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/useAuthStore';

export interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  gst_number: string;
}

const defaultSettings: CompanySettings = {
  company_name: '',
  address: '',
  phone: '',
  email: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  gst_number: '',
};

export const useCompanySettings = () => {
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'company_settings', user.tenant_id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as CompanySettings);
      } else {
        setSettings(defaultSettings);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch company settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const update = async (newSettings: CompanySettings) => {
    if (!user) return;
    if (user.role !== 'boss') {
      throw new Error('Only the owner (Boss) can update company or bank settings.');
    }
    try {
      const docRef = doc(db, 'company_settings', user.tenant_id);
      await setDoc(docRef, newSettings, { merge: true });
      setSettings(newSettings);
      return newSettings;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update company settings');
    }
  };

  return { settings, loading, error, fetch, update };
};
