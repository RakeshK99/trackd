// Design tokens ported from Trackd_UI1/shared.jsx
// Source of truth for colors, status, typography across the app.

export const T = {
  green: '#1D9E75',
  greenDark: '#0F6E56',
  greenDarkest: '#085041',
  greenMint: '#5DCAA5',
  greenLight: '#E1F5EE',
  greenSubtle: '#F0FAF6',
  deepBg: '#0A2E1F',
  nearBlack: '#0D1117',
  ink: '#1A1A18',
  ink2: '#888780',
  ink3: '#B4B2A9',
  border: 'rgba(0,0,0,0.08)',
  border2: 'rgba(0,0,0,0.15)',
  surface: '#FFFFFF',
  surface2: '#F7FBF8',
  surface3: '#F1EFE8',
} as const;

export type AppStatus =
  | 'saved'
  | 'applied'
  | 'phone_screen'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'ghosted'
  | 'withdrawn';

export const STATUS: Record<
  Exclude<AppStatus, 'withdrawn'>,
  { label: string; color: string; dark: string }
> = {
  saved: { label: 'Saved', color: '#888780', dark: '#3F3F3C' },
  applied: { label: 'Applied', color: '#378ADD', dark: '#1E5FA8' },
  phone_screen: { label: 'Phone screen', color: '#7F77DD', dark: '#4F46A8' },
  interview: { label: 'Interview', color: '#1D9E75', dark: '#0F6E56' },
  offer: { label: 'Offer', color: '#639922', dark: '#3F6313' },
  ghosted: { label: 'Ghosted', color: '#EF9F27', dark: '#A2660C' },
  rejected: { label: 'Rejected', color: '#E24B4A', dark: '#A52928' },
};

export const STATUS_ORDER: AppStatus[] = [
  'saved',
  'applied',
  'phone_screen',
  'interview',
  'offer',
  'ghosted',
];

export const FONT = {
  serif: 'DMSerifDisplay_400Regular',
  sans: 'Outfit_400Regular',
  sansMed: 'Outfit_500Medium',
  sansSemi: 'Outfit_600SemiBold',
  mono: 'DMMono_400Regular',
  monoMed: 'DMMono_500Medium',
} as const;
