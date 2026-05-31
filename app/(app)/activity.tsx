import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { STATUS, T } from '@/theme/tokens';
import { activityText, useActivity, type ActivityItem } from '@/lib/activity';
import { CompanyLogo } from '@/components/CompanyLogo';
import { searchCompanies } from '@/lib/companies';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function iconFor(item: ActivityItem) {
  switch (item.event_type) {
    case 'email_received':
      return { name: 'mail' as const, color: STATUS.applied.color };
    case 'ghost_flagged':
      return { name: 'time' as const, color: STATUS.ghosted.color };
    case 'status_change':
      return { name: 'swap-vertical' as const, color: STATUS.interview.color };
    default:
      return { name: 'ellipse' as const, color: T.ink3 };
  }
}

export default function Activity() {
  const router = useRouter();
  const { items, markAllSeen } = useActivity();

  // Mark everything seen when this screen opens.
  useEffect(() => {
    markAllSeen();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={T.ink} />
        </Pressable>
        <Text style={styles.title}>Activity</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList<ActivityItem>
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const { title, detail } = activityText(item);
          const ic = iconFor(item);
          const domain = item.company ? searchCompanies(item.company, 1)[0]?.domain : undefined;
          return (
            <Pressable
              onPress={() => item.application_id && router.push(`/(app)/app/${item.application_id}`)}
              style={styles.row}
            >
              {domain ? (
                <CompanyLogo domain={domain} size={36} radius={8} />
              ) : (
                <View style={[styles.iconWrap, { backgroundColor: ic.color + '1F' }]}>
                  <Ionicons name={ic.name} size={18} color={ic.color} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{title}</Text>
                {detail && <Text style={styles.itemDetail}>{detail}</Text>}
              </View>
              <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80, gap: 10 }}>
            <Ionicons name="notifications-off-outline" size={40} color={T.ink3} />
            <Text style={{ fontFamily: 'Outfit_400Regular', color: T.ink2, fontSize: 14 }}>
              No activity yet. When a recruiter emails you, it shows up here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: T.ink },
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: T.ink, textTransform: 'capitalize' },
  itemDetail: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: T.ink2, marginTop: 2 },
  time: { fontFamily: 'DMMono_400Regular', fontSize: 10.5, color: T.ink3 },
});
