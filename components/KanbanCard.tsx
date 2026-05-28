import { Pressable, Text, View } from 'react-native';
import { STATUS, T, type AppStatus } from '@/theme/tokens';
import type { Application } from '@/lib/types';

function shortDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function daysSilent(lastActivity: string) {
  return Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
}

export function KanbanCard({ app, onPress }: { app: Application; onPress: () => void }) {
  const s = STATUS[app.status as keyof typeof STATUS] ?? STATUS.applied;
  const isGhost = app.status === 'ghosted';
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: isGhost ? '#FDF7EB' : '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 0.5,
        borderColor: T.border,
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: s.color }} />
      <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 14, color: T.ink, marginBottom: 3 }}>
        {app.company}
      </Text>
      <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: T.ink2, lineHeight: 16 }}>
        {app.role}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 10.5, color: T.ink3 }}>
          {shortDate(app.applied_date ?? app.last_activity)}
        </Text>
        {app.salary_range && !isGhost && (
          <View style={{ backgroundColor: T.greenLight, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
            <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 9.5, color: T.greenDark, letterSpacing: 0.4 }}>
              {app.salary_range}
            </Text>
          </View>
        )}
        {isGhost && (
          <View style={{ backgroundColor: 'rgba(239,159,39,0.14)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
            <Text style={{ fontFamily: 'DMMono_500Medium', fontSize: 9, color: '#B07512', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {daysSilent(app.last_activity)}d silent
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
