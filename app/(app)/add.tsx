import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { STATUS, STATUS_ORDER, T, type AppStatus } from '@/theme/tokens';
import { useAuth } from '@/lib/auth';
import { createApplication, useApplications } from '@/lib/applications';
import { CompanyAutocomplete } from '@/components/CompanyAutocomplete';

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD for DB
}
function displayDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function AddJob() {
  const { user, refreshUser } = useAuth();
  const { upsertLocal } = useApplications();
  const router = useRouter();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [status, setStatus] = useState<AppStatus>('applied');
  const [appliedDate, setAppliedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!user) return;
    if (!company.trim() || !role.trim()) {
      Alert.alert('Missing', 'Company and role are required.');
      return;
    }
    setBusy(true);
    const { data, error } = await createApplication({
      user_id: user.id,
      company,
      role,
      status,
      salary_range: salary.trim() || null,
      applied_date: appliedDate ? fmtDate(appliedDate) : null,
    });
    setBusy(false);
    if (error) {
      if (error.message?.includes('FREE_TIER_LIMIT')) {
        Alert.alert(
          'Free tier limit',
          'You hit 15 active applications. Upgrade to Trackd Pro or delete one to add more.',
        );
      } else {
        Alert.alert('Error', error.message);
      }
      return;
    }
    if (data) upsertLocal(data);
    await refreshUser();
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={24} color={T.ink} />
          </Pressable>
          <Text style={styles.title}>Add job</Text>
          <Pressable onPress={save} disabled={busy}>
            <Text style={[styles.save, busy && { opacity: 0.4 }]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text style={styles.kicker}>COMPANY</Text>
            <CompanyAutocomplete value={company} onChangeText={setCompany} />
          </View>

          <Field label="Role" value={role} onChangeText={setRole} placeholder="SWE Intern · Summer '26" />
          <Field label="Salary (optional)" value={salary} onChangeText={setSalary} placeholder="$58/hr" />

          <View>
            <Text style={styles.kicker}>APPLIED DATE (OPTIONAL)</Text>
            <Pressable onPress={() => setShowPicker((v) => !v)} style={styles.input}>
              <Text
                style={{
                  fontFamily: 'Outfit_400Regular',
                  fontSize: 15,
                  color: appliedDate ? T.ink : T.ink3,
                }}
              >
                {appliedDate ? displayDate(appliedDate) : 'Pick a date'}
              </Text>
            </Pressable>
            {showPicker && (
              <View style={{ marginTop: 8, backgroundColor: '#fff', borderRadius: 12, padding: 8 }}>
                <DateTimePicker
                  value={appliedDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={new Date()}
                  onChange={(_e, selected) => {
                    if (Platform.OS !== 'ios') setShowPicker(false);
                    if (selected) setAppliedDate(selected);
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

          <Text style={styles.kicker}>STATUS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STATUS_ORDER.filter((s) => s !== 'ghosted').map((s) => {
              const st = STATUS[s as keyof typeof STATUS];
              const active = status === s;
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <View>
      <Text style={styles.kicker}>{props.label.toUpperCase()}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={T.ink3}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: T.ink },
  save: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: T.green },
  kicker: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 10,
    color: T.ink2,
    letterSpacing: 1.6,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: T.ink,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: T.greenLight,
  },
  doneText: { color: T.greenDark, fontFamily: 'Outfit_600SemiBold', fontSize: 13 },
});
