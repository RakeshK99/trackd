import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { STATUS, type AppStatus } from '@/theme/tokens';
import { logoFallbackUrl, logoUrl, searchCompanies } from '@/lib/companies';

export function CompanyAvatar({
  company,
  status,
  size = 36,
}: {
  company: string;
  status: AppStatus;
  size?: number;
}) {
  const [stage, setStage] = useState<'logo' | 'fallback' | 'initials'>('logo');
  const s = STATUS[status as keyof typeof STATUS] ?? STATUS.applied;
  const domain = searchCompanies(company, 1)[0]?.domain;

  if (domain && stage !== 'initials') {
    return (
      <Image
        source={{ uri: stage === 'logo' ? logoUrl(domain, size >= 64 ? 128 : 64) : logoFallbackUrl(domain) }}
        onError={() => setStage((v) => (v === 'logo' ? 'fallback' : 'initials'))}
        style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: s.color + '26' }}
      />
    );
  }

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
