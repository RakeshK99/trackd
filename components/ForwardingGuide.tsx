import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { T } from '@/theme/tokens';
import { openExternalUrl, openGmail } from '@/lib/linking';

// There's no reliable deep link straight to Gmail's filter screen on mobile
// (see lib/linking.ts openGmail), so these steps spell out the manual nav
// from wherever "Open Gmail" actually lands.
const STEPS = [
  'Tap "Open Gmail" below, then open the ☰ menu → Settings → tap your account → "See all settings".',
  'Go to the "Filters and Blocked Addresses" tab → "Create a new filter".',
  'In the “Has the words” box, type: recruiter OR interview OR application OR hiring',
  'Click “Create filter”, then check “Forward it to” and pick your Trackd address.',
  "That's it — recruiter emails now flow into Trackd automatically.",
];

export function ForwardingGuide({ trackdEmail }: { trackdEmail: string | null | undefined }) {
  async function copy() {
    if (!trackdEmail) return;
    await Clipboard.setStringAsync(trackdEmail);
    Alert.alert('Copied', trackdEmail);
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.emailPill}>
        <Text style={styles.emailText} numberOfLines={1}>
          {trackdEmail ?? '…provisioning…'}
        </Text>
        <Pressable onPress={copy} hitSlop={8} style={styles.copyInline}>
          <Ionicons name="copy-outline" size={16} color={T.greenDark} />
          <Text style={styles.copyInlineText}>Copy</Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{s}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <Pressable onPress={openGmail} style={styles.primaryBtn}>
          <Ionicons name="mail-outline" size={16} color="#fff" />
          <Text style={styles.primaryText}>Open Gmail</Text>
        </Pressable>
        <Pressable
          onPress={() => openExternalUrl('https://support.google.com/mail/answer/6579', "Google's filter guide")}
          style={styles.helpBtn}
        >
          <Ionicons name="play-circle-outline" size={16} color={T.greenDark} />
          <Text style={styles.helpBtnText}>See Google's step-by-step guide (with screenshots)</Text>
        </Pressable>
        <Pressable
          onPress={() => openExternalUrl('https://outlook.live.com/mail/0/options/mail/rules', 'Outlook rules')}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>Using Outlook instead?</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.greenSubtle,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  emailText: { flex: 1, fontFamily: 'DMMono_500Medium', fontSize: 14, color: T.greenDark },
  copyInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyInlineText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: T.greenDark },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 11 },
  stepText: { flex: 1, fontFamily: 'Outfit_400Regular', fontSize: 13.5, color: T.ink, lineHeight: 19 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.green,
    borderRadius: 999,
    paddingVertical: 13,
  },
  primaryText: { color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 14 },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: T.greenSubtle,
    borderWidth: 0.5,
    borderColor: 'rgba(29,158,117,0.28)',
  },
  helpBtnText: { color: T.greenDark, fontFamily: 'Outfit_600SemiBold', fontSize: 13 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 8 },
  secondaryText: { color: T.ink2, fontFamily: 'Outfit_500Medium', fontSize: 13 },
});
