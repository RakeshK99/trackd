import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated as RNAnimated,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { registerForPush } from '@/lib/push';
import { openExternalUrl, openGmail } from '@/lib/linking';
import { Dot, type DotMood } from '@/components/Dot';
import { STATUS, T } from '@/theme/tokens';

interface Step {
  eyebrow: string;
  mood: DotMood;
  dotSize: number;
  title: string;
  body: string;
  panel?: 'inbox' | 'pipeline' | 'notif';
}

const STEPS: Step[] = [
  {
    eyebrow: 'WELCOME',
    mood: 'happy',
    dotSize: 168,
    title: "hey — i'm Dot.",
    body: "the little dot from trackd. i'll help you take control of your job search.",
  },
  {
    eyebrow: 'STEP ONE',
    mood: 'look',
    dotSize: 104,
    title: 'forward your emails to me.',
    body: 'send recruiter emails to your trackd inbox and i read them for you — no manual updates.',
    panel: 'inbox',
  },
  {
    eyebrow: 'STEP TWO',
    mood: 'happy',
    dotSize: 104,
    title: 'watch your pipeline fill up.',
    body: 'every email moves the right application to the right stage, automatically.',
    panel: 'pipeline',
  },
  {
    eyebrow: "YOU'RE SET",
    mood: 'excited',
    dotSize: 140,
    title: "let's land you an offer.",
    body: "i'll ping you on the big moments — interviews, offers, and when something goes quiet.",
    panel: 'notif',
  },
];

function useTypewriter(text: string, speed = 26) {
  const [out, setOut] = useState('');
  useEffect(() => {
    setOut('');
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return out;
}

export default function Onboarding() {
  const { user, refreshUser, session } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notif, setNotif] = useState(true);
  const [busy, setBusy] = useState(false);

  const trackdEmail = user?.trackd_email;
  const name = (user?.display_name ?? 'there').split(' ')[0];
  const s = STEPS[step];
  const typed = useTypewriter(s.title);

  const fade = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    RNAnimated.timing(fade, { toValue: 1, duration: 360, useNativeDriver: true }).start();
  }, [step, done]);

  // Provision the inbox if it isn't ready yet.
  useEffect(() => {
    if (!user || user.trackd_email || !session) return;
    supabase.functions
      .invoke('on-user-signup', {
        body: { user_id: user.id, email: user.email, display_name: user.display_name },
      })
      .then(() => refreshUser());
  }, [user?.id, user?.trackd_email]);

  async function copyEmail() {
    if (!trackdEmail) return;
    await Clipboard.setStringAsync(trackdEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function next() {
    if (step < STEPS.length - 1) setStep((v) => v + 1);
    else setDone(true);
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    if (notif && user?.id) registerForPush(user.id).catch(() => undefined);
    const { error } = await supabase.from('users').update({ onboarded: true }).eq('id', user!.id);
    setBusy(false);
    if (error) return Alert.alert('Error', error.message);
    await refreshUser();
    router.replace('/(app)');
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#FBFEFC', '#F0FAF6', '#E1F5EE']} style={StyleSheet.absoluteFill} />
      {/* ambient blobs */}
      <View style={[styles.blob, { backgroundColor: 'rgba(93,202,165,0.35)', top: 80, left: -40 }]} />
      <View style={[styles.blob, { backgroundColor: 'rgba(136,216,232,0.28)', bottom: 140, right: -50 }]} />

      <SafeAreaView style={{ flex: 1 }}>
        {done ? (
          <RNAnimated.View style={[styles.center, { opacity: fade }]}>
            <Dot size={150} mood="excited" />
            <Text style={styles.wordmark}>
              trackd<Text style={{ color: T.green }}>.</Text>
            </Text>
            <Text style={styles.doneTitle}>you're all set, {name}.</Text>
            <Pressable onPress={finish} style={[styles.primary, busy && { opacity: 0.6 }]} disabled={busy}>
              <Text style={styles.primaryText}>start tracking</Text>
            </Pressable>
          </RNAnimated.View>
        ) : (
          <>
            {/* progress dots */}
            <View style={styles.progress}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pdot,
                    i === step && styles.pdotActive,
                    i < step && { backgroundColor: T.greenMint },
                  ]}
                />
              ))}
            </View>

            <RNAnimated.View style={[{ flex: 1, opacity: fade }]}>
              <View style={styles.stage}>
                <Dot size={s.dotSize} mood={s.mood} />
              </View>

              <View style={styles.copy}>
                <Text style={styles.eyebrow}>{s.eyebrow}</Text>
                <Text style={styles.headline}>{typed}</Text>
                <Text style={styles.body}>{s.body}</Text>

                {s.panel === 'inbox' && (
                  <View style={styles.panel}>
                    <Text style={styles.panelLabel}>YOUR TRACKD INBOX</Text>
                    <View style={styles.emailRow}>
                      <Text style={styles.email} numberOfLines={1}>
                        {trackdEmail ?? '…provisioning…'}
                      </Text>
                      <Pressable onPress={copyEmail} style={styles.copyChip} disabled={!trackdEmail}>
                        <Text style={styles.copyChipText}>{copied ? 'COPIED' : 'COPY'}</Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={openGmail} style={styles.gmailBtn}>
                      <Ionicons name="mail-outline" size={15} color={T.greenDark} />
                      <Text style={styles.gmailBtnText}>Set up Gmail forwarding</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openExternalUrl('https://support.google.com/mail/answer/6579', "Google's filter guide")}
                      style={{ alignItems: 'center', paddingTop: 8 }}
                    >
                      <Text style={styles.helpLink}>Need help? See Google's step-by-step guide</Text>
                    </Pressable>
                  </View>
                )}

                {s.panel === 'pipeline' && (
                  <View style={styles.miniPipeline}>
                    {(['applied', 'interview', 'offer'] as const).map((st) => (
                      <View key={st} style={styles.miniCol}>
                        <View style={[styles.miniBar, { backgroundColor: STATUS[st].color }]} />
                        <Text style={styles.miniColLabel}>{STATUS[st].label}</Text>
                        <View style={styles.miniCard} />
                        <View style={[styles.miniCard, { opacity: 0.6 }]} />
                      </View>
                    ))}
                  </View>
                )}

                {s.panel === 'notif' && (
                  <View style={styles.panel}>
                    <View style={styles.notifRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifTitle}>Ping me on the big moments</Text>
                        <Text style={styles.notifSub}>Interviews, offers, ghosting alerts</Text>
                      </View>
                      <Switch
                        value={notif}
                        onValueChange={setNotif}
                        trackColor={{ true: T.green, false: T.ink3 }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* controls */}
              <View style={styles.controls}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {step > 0 && (
                    <Pressable onPress={() => setStep((v) => v - 1)} style={styles.glassBtn}>
                      <Ionicons name="chevron-back" size={22} color={T.greenDark} />
                    </Pressable>
                  )}
                  <Pressable onPress={next} style={[styles.primary, { flex: 1 }]}>
                    <Text style={styles.primaryText}>
                      {step === STEPS.length - 1 ? 'enter trackd' : 'continue'}
                    </Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setDone(true)} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={styles.skip}>skip setup</Text>
                </Pressable>
              </View>
            </RNAnimated.View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', width: 260, height: 260, borderRadius: 130, opacity: 0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 28 },
  wordmark: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 40, color: T.ink, marginTop: 10 },
  doneTitle: { fontFamily: 'Outfit_400Regular', fontSize: 16, color: T.ink2 },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 8 },
  pdot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.ink3, opacity: 0.5 },
  pdotActive: { width: 22, backgroundColor: T.green, opacity: 1 },
  stage: { height: 230, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, paddingHorizontal: 28 },
  eyebrow: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 11,
    letterSpacing: 2.4,
    color: T.greenDark,
    marginBottom: 12,
  },
  headline: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 34,
    color: T.ink,
    lineHeight: 40,
    letterSpacing: -0.5,
    minHeight: 80,
  },
  body: { fontFamily: 'Outfit_400Regular', fontSize: 15, lineHeight: 23, color: T.ink2, marginTop: 12 },
  panel: {
    marginTop: 22,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(29,158,117,0.28)',
    padding: 16,
    gap: 12,
  },
  panelLabel: { fontFamily: 'DMMono_500Medium', fontSize: 10, letterSpacing: 1.6, color: T.ink2 },
  emailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  email: { flex: 1, fontFamily: 'DMMono_500Medium', fontSize: 14, color: T.greenDark },
  copyChip: { backgroundColor: T.green, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  copyChipText: { color: '#fff', fontFamily: 'DMMono_500Medium', fontSize: 11, letterSpacing: 1 },
  gmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: T.greenLight,
    borderRadius: 10,
    paddingVertical: 11,
  },
  gmailBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13.5, color: T.greenDark },
  helpLink: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: T.ink2, textDecorationLine: 'underline' },
  miniPipeline: { flexDirection: 'row', gap: 10, marginTop: 22 },
  miniCol: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(29,158,117,0.22)',
    padding: 10,
    gap: 7,
  },
  miniBar: { height: 3, borderRadius: 2, width: 24 },
  miniColLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 10.5, color: T.ink },
  miniCard: { height: 26, borderRadius: 7, backgroundColor: '#fff', borderWidth: 0.5, borderColor: T.border },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: T.ink },
  notifSub: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: T.ink2, marginTop: 2 },
  controls: { paddingHorizontal: 28, paddingBottom: 8, gap: 4 },
  primary: {
    height: 54,
    backgroundColor: T.green,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.green,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryText: { color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
  glassBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(29,158,117,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: T.ink2 },
});
