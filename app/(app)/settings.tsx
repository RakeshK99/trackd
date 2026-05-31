import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { ForwardingGuide } from '@/components/ForwardingGuide';
import { T } from '@/theme/tokens';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [showGuide, setShowGuide] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.kicker}>EMAIL FORWARDING</Text>
          <Text style={styles.body}>
            Forward recruiter emails to your Trackd inbox so your pipeline updates automatically.
          </Text>
          <Pressable
            onPress={() => setShowGuide((v) => !v)}
            style={[styles.copyBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
          >
            <Text style={styles.copyText}>{showGuide ? 'Hide setup' : 'Set up forwarding'}</Text>
            <Ionicons name={showGuide ? 'chevron-up' : 'chevron-down'} size={14} color={T.greenDark} />
          </Pressable>
          {showGuide && (
            <View style={{ marginTop: 6 }}>
              <ForwardingGuide trackdEmail={user?.trackd_email} />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>PLAN</Text>
          <Text style={styles.email}>
            {user?.plan === 'pro' ? 'Trackd Pro' : 'Free'}
          </Text>
          <Text style={styles.body}>
            {user?.plan === 'pro'
              ? 'Unlimited apps + AI features.'
              : `${user?.active_app_count ?? 0} / 15 active applications.`}
          </Text>
          {user?.plan !== 'pro' && (
            <Pressable
              onPress={() => Alert.alert('Trackd Pro', 'Coming in v2 — $4.99/mo.')}
              style={[styles.copyBtn, { backgroundColor: T.green }]}
            >
              <Text style={[styles.copyText, { color: '#fff' }]}>Upgrade to Pro</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>ACCOUNT</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Pressable onPress={signOut} style={[styles.copyBtn, { backgroundColor: '#FBECEB' }]}>
            <Text style={[styles.copyText, { color: '#A52928' }]}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: T.ink },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 0.5,
    borderColor: T.border,
    gap: 10,
  },
  kicker: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: T.ink2, letterSpacing: 1.6 },
  email: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: T.ink },
  body: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: T.ink2 },
  copyBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: T.greenLight,
  },
  copyText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: T.greenDark },
});
