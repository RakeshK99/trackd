import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CompanyAvatar } from '@/components/CompanyAvatar';
import { StatusBadge } from '@/components/StatusBadge';
import { T } from '@/theme/tokens';
import { useApplications } from '@/lib/applications';
import type { Application } from '@/lib/types';

const FILTERS = [
  { k: 'all', l: 'All' },
  { k: 'active', l: 'Active' },
  { k: 'interview', l: 'Interview' },
  { k: 'offer', l: 'Offer' },
  { k: 'ghosted', l: 'Ghosted' },
] as const;

type FilterKey = (typeof FILTERS)[number]['k'];

export default function AllApps() {
  const router = useRouter();
  const { apps } = useApplications();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return apps.filter((a) => {
      if (filter === 'active' && ['offer', 'rejected', 'ghosted'].includes(a.status)) return false;
      if (filter !== 'all' && filter !== 'active' && a.status !== filter) return false;
      if (needle && !(a.company.toLowerCase().includes(needle) || a.role.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [apps, filter, q]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>All apps</Text>
        <TextInput
          placeholder="Search company or role"
          placeholderTextColor={T.ink3}
          value={q}
          onChangeText={setQ}
          style={styles.search}
        />
        <View style={styles.chipRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.k}
              onPress={() => setFilter(f.k)}
              style={[styles.chip, filter === f.k && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f.k && { color: '#fff' }]}>{f.l}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList<Application>
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(app)/app/${item.id}`)} style={styles.row}>
            <CompanyAvatar company={item.company} status={item.status} />
            <View style={{ flex: 1 }}>
              <Text style={styles.company}>{item.company}</Text>
              <Text style={styles.role}>{item.role}</Text>
            </View>
            <StatusBadge status={item.status} />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: T.ink2, marginTop: 40, fontFamily: 'Outfit_400Regular' }}>
            No applications match.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, gap: 12 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: T.ink },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: T.ink,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: T.border,
  },
  chipActive: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: T.ink2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: T.border,
  },
  company: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: T.ink },
  role: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: T.ink2, marginTop: 2 },
});
