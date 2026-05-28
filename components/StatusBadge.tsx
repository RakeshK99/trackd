import { Text, View } from 'react-native';
import { STATUS, type AppStatus } from '@/theme/tokens';

export function StatusBadge({ status, size = 'sm' }: { status: AppStatus; size?: 'sm' | 'lg' }) {
  const s = STATUS[status as keyof typeof STATUS];
  if (!s) return null;
  return (
    <View
      style={{
        backgroundColor: s.color + '1F',
        paddingHorizontal: size === 'lg' ? 9 : 7,
        paddingVertical: size === 'lg' ? 4 : 3,
        borderRadius: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: s.dark,
          fontFamily: 'DMMono_500Medium',
          fontSize: size === 'lg' ? 10 : 9,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {s.label}
      </Text>
    </View>
  );
}
