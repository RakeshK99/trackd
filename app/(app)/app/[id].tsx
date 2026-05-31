import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { STATUS, STATUS_ORDER, T, type AppStatus } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import {
  deleteApplication,
  updateApplication,
  useApplications,
} from '@/lib/applications';
import { StatusBadge } from '@/components/StatusBadge';
import { logoUrl, searchCompanies } from '@/lib/companies';
import type { Application, TimelineEvent } from '@/lib/types';

function fmtDB(d: Date) {
  return d.toISOString().slice(0, 10);
}
function displayDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function AppDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { upsertLocal } = useApplications();

  const [app, setApp] = useState<Application | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  // Local editable copies — saved on blur, no separate "edit mode".
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [notes, setNotes] = useState('');
  const [showPicker, setShowPicker] = useState(false);

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
    const row = a as Application | null;
    setApp(row);
    setCompany(row?.company ?? '');
    setRole(row?.role ?? '');
    setSalary(row?.salary_range ?? '');
    setNotes(row?.notes ?? '');
    setEvents((ev as TimelineEvent[]) ?? []);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function patch(p: Partial<Application>) {
    if (!app) return;
    const { data } = await updateApplication(app.id, p);
    if (data) {
      setApp(data);
      upsertLocal(data);
    }
  }

  function maybeSave(field: keyof Application, value: string | null) {
    if (!app) return;
    if ((app[field] ?? '') === (value ?? '')) return;
    patch({ [field]: value } as Partial<Application>);
  }

  function onDelete() {
    if (!app) return;
    Alert.alert(
      'Delete application',
      `Permanently delete ${app.company}? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteApplication(app.id);
            router.back();
          },
        },
      ],
    );
  }

  if (!app) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }}>
        <Text style={{ padding: 24, color: T.ink2, fontFamily: 'Outfit_400Regular' }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  // Best-effort logo from the curated company list.
  const logoMatch = searchCompanies(app.company, 1)[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={T.ink} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={10}>
          <Ionicons name="trash-outline" size={22} color="#A52928" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          {logoMatch && (
            <Image
              source={{ uri: logoUrl(logoMatch.domain, 96) }}
              style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: T.surface3 }}
            />
          )}
          <View style={{ flex: 1 }}>
            <TextInput
              value={company}
              onChangeText={setCompany}
              onBlur={() => maybeSave('company', company.trim())}
              style={styles.companyInput}
              placeholder="Company"
              placeholderTextColor={T.ink3}
            />
            <TextInput
              value={role}
              onChangeText={setRole}
              onBlur={() => maybeSave('role', role.trim())}
              style={styles.roleInput}
              placeholder="Role"
              placeholderTextColor={T.ink3}
            />
            <View style={{ marginTop: 6 }}>
              <StatusBadge status={app.status} size="lg" />
            </View>
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
                  onPress={() => patch({ status: s as AppStatus })}
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
          <Text style={styles.kicker}>DETAILS</Text>

          <Row label="Salary">
            <TextInput
              value={salary}
              onChangeText={setSalary}
              onBlur={() => maybeSave('salary_range', salary.trim() || null)}
              placeholder="—"
              placeholderTextColor={T.ink3}
              style={styles.fieldInput}
            />
          </Row>

          <Row label="Applied">
            <Pressable onPress={() => setShowPicker((v) => !v)} style={{ flex: 1 }}>
              <Text style={styles.fieldText}>
                {app.applied_date ? displayDate(app.applied_date) : 'Pick a date'}
              </Text>
            </Pressable>
          </Row>

          {showPicker && (
            <View style={{ marginTop: 4, alignItems: 'center' }}>
              <DateTimePicker
                value={app.applied_date ? new Date(app.applied_date) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(_e, selected) => {
                  if (Platform.OS !== 'ios') setShowPicker(false);
                  if (selected) patch({ applied_date: fmtDB(selected) });
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable onPress={() => setShowPicker(false)} style={styles.doneBtn}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>NOTES</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onBlur={() => maybeSave('notes', notes)}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <Text style={{ width: 70, fontFamily: 'Outfit_500Medium', fontSize: 12, color: T.ink2 }}>
        {label}
      </Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  companyInput: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: T.ink,
    padding: 0,
  },
  roleInput: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: T.ink2,
    marginTop: 2,
    padding: 0,
  },
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
  fieldInput: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: T.ink,
    paddingVertical: 4,
  },
  fieldText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: T.ink,
    paddingVertical: 4,
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
  doneBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: T.greenLight,
  },
  doneText: { color: T.greenDark, fontFamily: 'Outfit_600SemiBold', fontSize: 13 },
});
