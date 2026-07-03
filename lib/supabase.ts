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

// SecureStore enforces a ~2048-byte limit per item; a serialized Supabase
// session (access + refresh JWT) can exceed that. Split across N chunk keys
// instead of writing the value directly.
const CHUNK_SIZE = 1800;

async function setItemChunked(key: string, value: string) {
  const chunkCount = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
  const chunks: Promise<void>[] = [SecureStore.setItemAsync(`${key}_chunks`, String(chunkCount))];
  for (let i = 0; i < chunkCount; i++) {
    chunks.push(SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)));
  }
  await Promise.all(chunks);
}

async function getItemChunked(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
  if (!countRaw) return null;
  const chunkCount = parseInt(countRaw, 10);
  const parts = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`)),
  );
  if (parts.some((p) => p == null)) return null;
  return parts.join('');
}

async function removeItemChunked(key: string) {
  const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
  const chunkCount = countRaw ? parseInt(countRaw, 10) : 0;
  await Promise.all([
    SecureStore.deleteItemAsync(`${key}_chunks`),
    ...Array.from({ length: chunkCount }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`)),
  ]);
}

// SecureStore on native (chunked, see above), AsyncStorage on web (SecureStore
// is unavailable in browsers).
const storage =
  Platform.OS === 'web'
    ? AsyncStorage
    : {
        getItem: getItemChunked,
        setItem: setItemChunked,
        removeItem: removeItemChunked,
      };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
