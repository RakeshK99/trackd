// Dot — trackd's liquid-glass mascot, the teal "." brought to life.
// Native recreation of the design bundle's CSS/SVG Dot: a glassy mint-white
// orb with expressive eyes, rosy cheeks, a smile, gentle bob + random blink.
// Moods: 'happy' | 'look' | 'excited'.
import { useEffect, useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';

export type DotMood = 'happy' | 'look' | 'excited';

function useBlink() {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      const wait = 2400 + Math.random() * 2800;
      t = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        setTimeout(() => {
          if (!alive) return;
          setBlink(false);
          loop();
        }, 130);
      }, wait);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);
  return blink;
}

export function Dot({
  size = 160,
  mood = 'happy',
  idle = true,
}: {
  size?: number;
  mood?: DotMood;
  idle?: boolean;
}) {
  const blink = useBlink();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!idle) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(-size * 0.035, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [idle, size]);

  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  // Geometry on a 100x100 viewBox.
  const eyeY = 46;
  const eyeDx = 13.5;
  const eyeRx = 7.2;
  const eyeRy = blink ? 0.9 : 9.4;
  const pupilR = 3.9;
  const PUPIL = '#0B4E3C';
  const arcEyes = mood === 'excited';

  return (
    <Animated.View style={[{ width: size, height: size }, bobStyle]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="dotBody" cx="38%" cy="30%" r="80%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="52%" stopColor="#eaf7f1" />
            <Stop offset="100%" stopColor="#cbe7dd" />
          </RadialGradient>
          <RadialGradient id="dotEye" cx="35%" cy="28%" r="90%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="55%" stopColor="#eef7f3" />
            <Stop offset="100%" stopColor="#d6ece4" />
          </RadialGradient>
          <RadialGradient id="dotCheek" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(246,150,140,0.55)" />
            <Stop offset="100%" stopColor="rgba(246,150,140,0)" />
          </RadialGradient>
        </Defs>

        {/* soft ground shadow */}
        <Ellipse cx="50" cy="96" rx="26" ry="4.5" fill="rgba(15,110,86,0.18)" />

        {/* glass body */}
        <Circle cx="50" cy="50" r="44" fill="url(#dotBody)" />
        {/* top specular highlight */}
        <Ellipse cx="38" cy="30" rx="18" ry="12" fill="rgba(255,255,255,0.55)" />
        {/* bottom inner shading rim */}
        <Circle cx="50" cy="50" r="44" fill="none" stroke="rgba(15,110,86,0.10)" strokeWidth="1.5" />

        {/* cheeks */}
        <Ellipse cx={50 - eyeDx - 3} cy={eyeY + 7} rx="6" ry="3.6" fill="url(#dotCheek)" opacity={mood === 'excited' ? 0.95 : 0.6} />
        <Ellipse cx={50 + eyeDx + 3} cy={eyeY + 7} rx="6" ry="3.6" fill="url(#dotCheek)" opacity={mood === 'excited' ? 0.95 : 0.6} />

        {/* eyes */}
        {arcEyes ? (
          <G>
            <Path d={`M${50 - eyeDx - 5} ${eyeY + 2} Q${50 - eyeDx} ${eyeY - 5} ${50 - eyeDx + 5} ${eyeY + 2}`} stroke={PUPIL} strokeWidth="3" strokeLinecap="round" fill="none" />
            <Path d={`M${50 + eyeDx - 5} ${eyeY + 2} Q${50 + eyeDx} ${eyeY - 5} ${50 + eyeDx + 5} ${eyeY + 2}`} stroke={PUPIL} strokeWidth="3" strokeLinecap="round" fill="none" />
          </G>
        ) : (
          <G>
            {[-1, 1].map((s) => (
              <G key={s}>
                <Ellipse cx={50 + s * eyeDx} cy={eyeY} rx={eyeRx} ry={eyeRy} fill="url(#dotEye)" />
                {!blink && (
                  <>
                    <Circle cx={50 + s * eyeDx} cy={eyeY + 0.6} r={pupilR} fill={PUPIL} />
                    <Circle cx={50 + s * eyeDx + 1.1} cy={eyeY - 0.8} r={1.1} fill="#ffffff" opacity={0.95} />
                  </>
                )}
              </G>
            ))}
          </G>
        )}

        {/* mouth */}
        {mood === 'excited' ? (
          <G>
            <Path d="M42 60 C45 70 55 70 58 60 C55 64 45 64 42 60 Z" fill="#0B4E3C" />
            <Path d="M46 63 C48 66 52 66 54 63 C52 65 48 65 46 63 Z" fill="#E2706A" opacity={0.85} />
          </G>
        ) : mood === 'look' ? (
          <Path d={`M45 59 Q50 63 55 59`} stroke="#0B4E3C" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        ) : (
          <Path d={`M44 59 Q50 65 56 59`} stroke="#0B4E3C" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        )}
      </Svg>
    </Animated.View>
  );
}
