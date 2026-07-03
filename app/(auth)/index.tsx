import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { T } from '@/theme/tokens';
import { Lockup } from '@/components/Lockup';

export default function SignInScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        });
        if (error) throw error;
        // AgentMail inbox provisioning happens once, on the onboarding screen
        // (app/(auth)/onboarding.tsx) — the single documented call site for
        // on-user-signup. Don't duplicate the call here.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      Alert.alert('Auth error', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Lockup size={42} theme="dark" />
          <Text style={styles.tag}>Your job search, finally under control.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>

          {mode === 'signup' && (
            <TextInput
              placeholder="Full name"
              placeholderTextColor={T.ink3}
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoCapitalize="words"
            />
          )}
          <TextInput
            placeholder="Email"
            placeholderTextColor={T.ink3}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={T.ink3}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            autoComplete="password"
          />

          <Pressable onPress={submit} style={[styles.cta, busy && { opacity: 0.6 }]} disabled={busy}>
            <Text style={styles.ctaText}>
              {busy ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Text>
          </Pressable>

          <Pressable onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
            <Text style={styles.switchText}>
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : "New here? Create an account"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.deepBg },
  header: { paddingTop: 32, paddingHorizontal: 28, paddingBottom: 24 },
  tag: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
  },
  card: {
    margin: 20,
    padding: 24,
    backgroundColor: T.surface,
    borderRadius: 20,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    color: T.ink,
    marginBottom: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: T.border2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: T.ink,
    marginBottom: 12,
  },
  cta: {
    marginTop: 6,
    backgroundColor: T.green,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
  },
  switchText: {
    marginTop: 16,
    textAlign: 'center',
    color: T.ink2,
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
  },
});
