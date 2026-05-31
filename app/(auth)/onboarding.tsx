import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Lockup } from '@/components/Lockup';
import { ForwardingGuide } from '@/components/ForwardingGuide';
import { T } from '@/theme/tokens';

export default function Onboarding() {
  const { user, refreshUser, session } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const trackdEmail = user?.trackd_email;

  // If inbox not yet provisioned, kick off provisioning once.
  useEffect(() => {
    if (!user || user.trackd_email || !session) return;
    supabase.functions
      .invoke('on-user-signup', {
        body: { user_id: user.id, email: user.email, display_name: user.display_name },
      })
      .then(() => refreshUser());
  }, [user?.id, user?.trackd_email]);

  async function finish() {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase
      .from('users')
      .update({ onboarded: true })
      .eq('id', user!.id);
    setBusy(false);
    if (error) return Alert.alert('Error', error.message);
    await refreshUser();
    router.replace('/(app)');
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ padding: 28, paddingBottom: 12 }}>
          <Lockup size={32} theme="dark" />
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>YOUR TRACKD INBOX</Text>
          <Text style={styles.title}>
            One-time setup,{'\n'}then it runs itself.
          </Text>
          <Text style={styles.body}>
            Set up a single Gmail rule that forwards recruiter emails to your Trackd inbox. After
            this, your pipeline updates automatically — you never have to enter a status by hand.
          </Text>

          <ForwardingGuide trackdEmail={trackdEmail} />
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Pressable onPress={finish} style={[styles.cta, busy && { opacity: 0.6 }]} disabled={busy}>
            <Text style={styles.ctaText}>{busy ? '…' : "I'll do this later — continue"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.deepBg },
  card: {
    margin: 20,
    padding: 24,
    backgroundColor: T.surface,
    borderRadius: 20,
  },
  kicker: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 10,
    letterSpacing: 2,
    color: T.ink2,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 24,
    color: T.ink,
    lineHeight: 30,
    marginBottom: 16,
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: T.ink2,
    marginBottom: 22,
  },
  copyBtn: {
    backgroundColor: T.greenLight,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
  },
  copyText: {
    color: T.greenDark,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
  cta: {
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
});
