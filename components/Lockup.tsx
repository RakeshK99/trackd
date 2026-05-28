import { Text, View } from 'react-native';
import { T } from '@/theme/tokens';

export function Lockup({ size = 28, theme = 'light' }: { size?: number; theme?: 'light' | 'dark' }) {
  const color = theme === 'light' ? T.ink : '#fff';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text
        style={{
          fontFamily: 'DMSerifDisplay_400Regular',
          fontSize: size,
          lineHeight: size,
          letterSpacing: -1,
          color,
        }}
      >
        trackd
      </Text>
      <Text
        style={{
          fontFamily: 'DMSerifDisplay_400Regular',
          fontSize: size,
          lineHeight: size,
          color: T.green,
        }}
      >
        .
      </Text>
    </View>
  );
}
