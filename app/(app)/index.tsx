import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { STATUS, STATUS_ORDER, T } from '@/theme/tokens';
import { Lockup } from '@/components/Lockup';
import { KanbanCard } from '@/components/KanbanCard';
import { useAuth } from '@/lib/auth';
import { useApplications } from '@/lib/applications';
import { useActivity } from '@/lib/activity';

export default function Pipeline() {
  const { user } = useAuth();
  const router = useRouter();
  const { apps, loading } = useApplications();
  const { unread } = useActivity();

  const grouped = useMemo(() => {
    const out: Record<string, typeof apps> = {};
    for (const s of STATUS_ORDER) out[s] = [];
    for (const a of apps) (out[a.status] ||= []).push(a);
    return out;
  }, [apps]);

  const totals = useMemo(
    () => ({
      total: apps.length,
      active: apps.filter((a) => !['offer', 'rejected', 'ghosted'].includes(a.status)).length,
      interview: apps.filter((a) => a.status === 'interview').length,
      ghost: apps.filter((a) => a.status === 'ghosted').length,
    }),
    [apps],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }} edges={['top']}>
      <View style={styles.topbar}>
        <Lockup size={26} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.push('/(app)/activity')} hitSlop={8} style={{ padding: 4 }}>
            <Ionicons name="notifications-outline" size={24} color={T.ink} />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/add')} style={styles.addBtn}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.addText}>Add job</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.stats}>
        {[
          { n: totals.total, l: 'Total' },
          { n: totals.active, l: 'Active' },
          { n: totals.interview, l: 'Intvw' },
          { n: totals.ghost, l: 'Ghost', warn: true },
        ].map((s, i) => (
          <View key={s.l} style={[styles.statCell, i < 3 && { borderRightWidth: 0.5, borderRightColor: T.border }]}>
            <Text style={[styles.statNum, s.warn && { color: STATUS.ghosted.color }]}>{s.n}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      {user?.plan === 'free' && (
        <View style={styles.freeBanner}>
          <Text style={styles.freeBannerText}>
            {user.active_app_count} / 15 applications · free tier
          </Text>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.green} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          style={{ flex: 1 }}
        >
          {STATUS_ORDER.map((stKey) => {
            const col = grouped[stKey] ?? [];
            const st = STATUS[stKey as keyof typeof STATUS];
            if (!st) return null;
            return (
              <View key={stKey} style={{ width: 260, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.color }} />
                  <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: T.ink }}>{st.label}</Text>
                  <View style={{ backgroundColor: T.surface3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 10, color: T.ink2 }}>{col.length}</Text>
                  </View>
                </View>
                {col.length === 0 ? (
                  <Text style={{ fontFamily: 'Outfit_400Regular', color: T.ink3, fontSize: 12, paddingVertical: 12 }}>
                    Nothing here yet.
                  </Text>
                ) : (
                  col.map((a) => (
                    <KanbanCard key={a.id} app={a} onPress={() => router.push(`/(app)/app/${a.id}`)} />
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addBtn: {
    backgroundColor: T.green,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addText: { color: '#fff', fontFamily: 'Outfit_500Medium', fontSize: 13 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E24B4A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: T.surface2,
  },
  badgeText: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 9.5 },
  stats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: T.border,
    overflow: 'hidden',
  },
  statCell: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  statNum: { fontFamily: 'DMMono_500Medium', fontSize: 22, color: T.ink, lineHeight: 24 },
  statLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 9.5,
    color: T.ink2,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  freeBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    backgroundColor: T.greenSubtle,
    borderRadius: 8,
    alignItems: 'center',
  },
  freeBannerText: {
    fontFamily: 'DMMono_400Regular',
    fontSize: 11,
    color: T.greenDark,
    letterSpacing: 0.4,
  },
});
