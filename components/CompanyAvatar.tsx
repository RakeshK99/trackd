import { Text, View } from 'react-native';
import { STATUS, type AppStatus } from '@/theme/tokens';

export function CompanyAvatar({
  company,
  status,
  size = 36,
}: {
  company: string;
  status: AppStatus;
  size?: number;
}) {
  const s = STATUS[status as keyof typeof STATUS] ?? STATUS.applied;
  const initials = company
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: s.color + '26',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: s.dark,
          fontFamily: 'Outfit_600SemiBold',
          fontSize: size * 0.36,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
