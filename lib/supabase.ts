import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

// SecureStore on native, AsyncStorage on web (SecureStore is unavailable in browsers).
const storage =
  Platform.OS === 'web'
    ? AsyncStorage
    : {
        getItem: (k: string) => SecureStore.getItemAsync(k),
        setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
        removeItem: (k: string) => SecureStore.deleteItemAsync(k),
      };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
