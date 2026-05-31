import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STATUS, STATUS_ORDER, T } from '@/theme/tokens';
import { useApplications } from '@/lib/applications';

export default function Analytics() {
  const { apps } = useApplications();

  const stats = useMemo(() => {
    const total = apps.length || 1;
    const responded = apps.filter((a) =>
      ['phone_screen', 'interview', 'offer', 'rejected'].includes(a.status),
    ).length;
    const counts: Record<string, number> = {};
    for (const s of STATUS_ORDER) counts[s] = 0;
    for (const a of apps) counts[a.status] = (counts[a.status] ?? 0) + 1;
    const max = Math.max(1, ...Object.values(counts));
    return { responseRate: Math.round((responded / total) * 100), counts, max };
  }, [apps]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface2 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={styles.title}>Analytics</Text>

        <View style={styles.card}>
          <Text style={styles.kicker}>RESPONSE RATE</Text>
          <Text style={styles.bigNum}>{stats.responseRate}%</Text>
          <Text style={styles.body}>
            of applications got past the “applied” stage.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>PIPELINE FUNNEL</Text>
          {STATUS_ORDER.map((s) => {
            const st = STATUS[s as keyof typeof STATUS];
            const n = stats.counts[s] ?? 0;
            const w = (n / stats.max) * 100;
            return (
              <View key={s} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.funnelLabel}>{st?.label}</Text>
                  <Text style={styles.funnelNum}>{n}</Text>
                </View>
                <View style={{ height: 8, backgroundColor: T.surface3, borderRadius: 4, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${w}%`,
                      height: '100%',
                      backgroundColor: st?.color ?? T.green,
                    }}
                  />
                </View>
              </View>
            );
          })}
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
  },
  kicker: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 10,
    color: T.ink2,
    letterSpacing: 1.6,
  },
  bigNum: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 48,
    color: T.ink,
    marginVertical: 8,
  },
  body: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: T.ink2 },
  funnelLabel: { fontFamily: 'Outfit_500Medium', fontSize: 12, color: T.ink },
  funnelNum: { fontFamily: 'DMMono_500Medium', fontSize: 12, color: T.ink2 },
});
