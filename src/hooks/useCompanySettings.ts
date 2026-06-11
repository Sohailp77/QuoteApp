import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
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
      const { data, error: fetchError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings({
          company_name: data.company_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          bank_name: data.bank_name || '',
          account_number: data.account_number || '',
          ifsc_code: data.ifsc_code || '',
          gst_number: data.gst_number || '',
        });
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
      const { error: updateError } = await supabase
        .from('company_settings')
        .upsert({
          tenant_id: user.tenant_id,
          company_name: newSettings.company_name,
          address: newSettings.address,
          phone: newSettings.phone,
          email: newSettings.email,
          bank_name: newSettings.bank_name,
          account_number: newSettings.account_number,
          ifsc_code: newSettings.ifsc_code,
          gst_number: newSettings.gst_number,
        });

      if (updateError) throw updateError;

      setSettings(newSettings);
      return newSettings;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update company settings');
    }
  };

  return { settings, loading, error, fetch, update };
};
