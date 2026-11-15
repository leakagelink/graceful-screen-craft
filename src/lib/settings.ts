import { useState, useEffect } from 'react';
import { supabase, type AppSettings } from '@/lib/supabase';

const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  trip_otp_length: 6,
  commission_rate: 0.05,
  updated_at: '',
  updated_by: null,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from('app_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setSettings(data as AppSettings);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { settings, loading };
}

export function generateOtp(length: number): string {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  return String(Math.floor(min + Math.random() * (max - min)));
}
