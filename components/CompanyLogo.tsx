import { useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp } from 'react-native';
import { logoFallbackUrl, logoUrl } from '@/lib/companies';
import { T } from '@/theme/tokens';

export function CompanyLogo({
  domain,
  size = 48,
  radius,
  style,
}: {
  domain: string | undefined;
  size?: number;
  radius?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const [errored, setErrored] = useState(false);
  const r = radius ?? Math.round(size * 0.22);

  if (!domain) {
    return (
      <View style={[{ width: size, height: size, borderRadius: r, backgroundColor: T.surface3 }, style as object]} />
    );
  }

  return (
    <Image
      source={{ uri: errored ? logoFallbackUrl(domain) : logoUrl(domain, size >= 64 ? 128 : 64) }}
      onError={() => setErrored(true)}
      style={[{ width: size, height: size, borderRadius: r, backgroundColor: T.surface3 }, style as object]}
    />
  );
}
