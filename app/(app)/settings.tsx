import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/lib/auth';
import { T } from '@/theme/tokens';

export default function Settings() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.kicker}>YOUR TRACKD EMAIL</Text>
          <Text style={styles.email}>{user?.trackd_email ?? '—'}</Text>
          <Pressable
            onPress={async () => {
              if (!user?.trackd_email) return;
              await Clipboard.setStringAsync(user.trackd_email);
              Alert.alert('Copied', user.trackd_email);
            }}
            style={styles.copyBtn}
          >
            <Text style={styles.copyText}>Copy</Text>
          </Pressable>
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
