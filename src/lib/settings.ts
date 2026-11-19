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
      .rpc('get_trip_settings')
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (active && row) setSettings((s) => ({ ...s, ...row }));
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
