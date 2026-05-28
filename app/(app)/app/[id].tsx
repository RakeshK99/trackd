import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { STATUS, STATUS_ORDER, T, type AppStatus } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import { archiveApplication, updateApplication } from '@/lib/applications';
import { StatusBadge } from '@/components/StatusBadge';
import type { Application, TimelineEvent } from '@/lib/types';

export default function AppDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState('');

  async function load() {
    if (!id) return;
    const [{ data: a }, { data: ev }] = await Promise.all([
      supabase.from('applications').select('*').eq('id', id).single(),
      supabase
        .from('timeline_events')
        .select('*')
        .eq('application_id', id)
        .order('created_at', { ascending: false }),
    ]);
    setApp(a as Application | null);
    setNotes((a as Application | null)?.notes ?? '');
    setEvents((ev as TimelineEvent[]) ?? []);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveNotes() {
    if (!app) return;
    if ((notes ?? '') === (app.notes ?? '')) return;
    await updateApplication(app.id, { notes });
  }

  async function setStatus(s: AppStatus) {
    if (!app) return;
    const { data } = await updateApplication(app.id, { status: s });
    if (data) setApp(data);
  }

  async function archive() {
    if (!app) return;
    Alert.alert('Archive', `Archive ${app.company}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await archiveApplication(app.id);
          router.back();
        },
      },
    ]);
  }

  if (!app) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }}>
        <Text style={{ padding: 24, color: T.ink2, fontFamily: 'Outfit_400Regular' }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={T.ink} />
        </Pressable>
        <Pressable onPress={archive} hitSlop={10}>
          <Ionicons name="archive-outline" size={22} color={T.ink2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View>
          <Text style={styles.company}>{app.company}</Text>
          <Text style={styles.role}>{app.role}</Text>
          <View style={{ marginTop: 8 }}>
            <StatusBadge status={app.status} size="lg" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>STATUS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STATUS_ORDER.map((s) => {
              const st = STATUS[s as keyof typeof STATUS];
              const active = app.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[
                    styles.pill,
                    { borderColor: active ? st.color : T.border },
                    active && { backgroundColor: st.color + '1F' },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: 'Outfit_500Medium',
                      fontSize: 12,
                      color: active ? st.dark : T.ink2,
                    }}
                  >
                    {st.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>NOTES</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onBlur={saveNotes}
            multiline
            placeholder="Contacts, next steps, prep links…"
            placeholderTextColor={T.ink3}
            style={styles.notes}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>TIMELINE</Text>
          {events.length === 0 ? (
            <Text style={{ fontFamily: 'Outfit_400Regular', color: T.ink3, fontSize: 13 }}>
              No activity yet.
            </Text>
          ) : (
            events.map((e) => (
              <View key={e.id} style={styles.event}>
                <Text style={styles.eventTitle}>
                  {e.event_type === 'status_change'
                    ? `${e.old_status ?? '—'} → ${e.new_status}`
                    : e.event_type === 'email_received'
                    ? `Email: ${e.email_subject ?? ''}`
                    : e.event_type}
                </Text>
                <Text style={styles.eventMeta}>
                  {new Date(e.created_at).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  company: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 30, color: T.ink },
  role: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: T.ink2, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: T.border,
    gap: 10,
  },
  kicker: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: T.ink2, letterSpacing: 1.6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  notes: {
    minHeight: 110,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: T.ink,
    textAlignVertical: 'top',
  },
  event: { paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: T.border },
  eventTitle: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: T.ink },
  eventMeta: { fontFamily: 'DMMono_400Regular', fontSize: 11, color: T.ink3, marginTop: 2 },
});
