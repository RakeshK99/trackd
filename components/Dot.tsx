// Dot — trackd's liquid-glass mascot, the teal "." in "trackd." brought to
// life. Recreated from the Claude Design handoff (design_handoff_trackd_dot_app/
// dot.jsx + trackd (Dot app).html's .dot-glass CSS) using react-native-svg +
// Reanimated in place of CSS radial/conic gradients and border-radius morphing,
// which have no RN equivalent — the character (glassy morphing blob, spinning
// iridescent rim, gaze-tracking blinking eyes, moods) is the spec, not the CSS.
import { useEffect, useState } from 'react';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type DotMood = 'happy' | 'look' | 'excited';

// The iridescent rim's conic-gradient palette, from design-tokens.
const RIM_COLORS = ['#ff9aa2', '#ffdac1', '#b5ead7', '#c7ceea', '#f0a8d0', '#88d8e8', '#a8e6cf'];

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarToXY(cx, cy, r, end);
  const e = polarToXY(cx, cy, r, start);
  const largeArc = end - start <= 180 ? '0' : '1';
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 0 ${e.x} ${e.y}`;
}

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

const SPARKLES = [
  { x: 8, y: 12, r: 1.6, delay: 0 },
  { x: 92, y: 20, r: 1.2, delay: 1100 },
  { x: 88, y: 82, r: 1.8, delay: 600 },
  { x: 10, y: 74, r: 1.2, delay: 1700 },
  { x: 50, y: 2, r: 1.4, delay: 900 },
];

function Sparkle({ x, y, r, delay }: { x: number; y: number; r: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1530, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 1870, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay]);
  const props = useAnimatedProps(() => ({
    opacity: t.value * 0.9,
    r: r * (0.3 + t.value * 0.7),
  }));
  return <AnimatedCircle cx={x} cy={y} fill={RIM_COLORS[Math.floor(x) % RIM_COLORS.length]} animatedProps={props} />;
}

export function Dot({
  size = 160,
  mood = 'happy',
  look = { x: 0, y: 0 },
  idle = true,
}: {
  size?: number;
  mood?: DotMood;
  look?: { x: number; y: number };
  idle?: boolean;
}) {
  const blink = useBlink();
  const bob = useSharedValue(0);
  const rimAngle = useSharedValue(0);
  const morph = useSharedValue(0);

  useEffect(() => {
    if (!idle) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(-size * 0.075, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    morph.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    rimAngle.value = withRepeat(withTiming(360, { duration: 10000, easing: Easing.linear }), -1, false);
  }, [idle, size]);

  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const shadowProps = useAnimatedProps(() => ({
    rx: 26 - Math.abs(bob.value) * 0.28,
    opacity: 0.24 - Math.abs(bob.value) * 0.006,
  }));
  const bodyProps = useAnimatedProps(() => ({
    rx: 44 + morph.value * 2.2,
    ry: 44 - morph.value * 2.2,
  }));
  const rimProps = useAnimatedProps(() => ({ rotation: rimAngle.value, origin: '50,50' }));

  // Geometry on a 100x100 viewBox.
  const eyeY = 46;
  const eyeDx = 13.5;
  const eyeRx = 7.2;
  const eyeRy = blink ? 0.9 : 9.4;
  const pupilR = 3.9;
  const shift = 3.4;
  const lookX = Math.max(-1, Math.min(1, look.x)) * shift;
  const lookY = Math.max(-1, Math.min(1, look.y)) * shift;
  const PUPIL = '#0B4E3C';
  const arcEyes = mood === 'excited';

  return (
    <Animated.View style={[{ width: size, height: size }, bobStyle]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="dotBody" cx="32%" cy="24%" r="85%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="35%" stopColor="#eaf7f1" />
            <Stop offset="70%" stopColor="#bfe8d8" />
            <Stop offset="100%" stopColor="#8fd0b8" />
          </RadialGradient>
          <RadialGradient id="specMain" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="specSoft" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="specBottom" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#a8e6cf" stopOpacity={0.65} />
            <Stop offset="100%" stopColor="#a8e6cf" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="dotEye" cx="35%" cy="28%" r="90%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="55%" stopColor="#eef7f3" />
            <Stop offset="100%" stopColor="#d6ece4" />
          </RadialGradient>
          <RadialGradient id="pupilGrad" cx="35%" cy="30%" r="90%">
            <Stop offset="0%" stopColor="#14624d" />
            <Stop offset="70%" stopColor="#0B4E3C" />
          </RadialGradient>
          <RadialGradient id="dotCheek" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(246,150,140,0.55)" />
            <Stop offset="100%" stopColor="rgba(246,150,140,0)" />
          </RadialGradient>
        </Defs>

        {/* ground contact shadow, syncs with the bob */}
        <AnimatedEllipse cx="50" cy="97" ry="4" fill="rgba(15,110,86,0.28)" animatedProps={shadowProps} />

        {/* spinning iridescent rim, behind the glass body */}
        <AnimatedG animatedProps={rimProps}>
          {RIM_COLORS.map((c, i) => (
            <Path
              key={c + i}
              d={arcPath(50, 50, 45.2, (i * 360) / RIM_COLORS.length, ((i + 1) * 360) / RIM_COLORS.length)}
              stroke={c}
              strokeWidth={1.4}
              strokeLinecap="round"
              fill="none"
              opacity={0.5}
            />
          ))}
        </AnimatedG>

        {/* glass body */}
        <AnimatedEllipse cx="50" cy="50" fill="url(#dotBody)" animatedProps={bodyProps} />

        {/* specular highlights */}
        <Ellipse cx="37" cy="26" rx="16" ry="11.5" fill="url(#specMain)" transform="rotate(-20 37 26)" />
        <Ellipse cx="28" cy="46" rx="10" ry="18" fill="url(#specSoft)" transform="rotate(18 28 46)" opacity={0.6} />
        <Ellipse cx="76" cy="76" rx="11" ry="8" fill="url(#specBottom)" />

        {/* floating sparkles */}
        {SPARKLES.map((s, i) => (
          <Sparkle key={i} {...s} />
        ))}

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
                  <G>
                    <Circle cx={50 + s * eyeDx + lookX} cy={eyeY + 0.6 + lookY} r={pupilR} fill="url(#pupilGrad)" />
                    <Circle cx={50 + s * eyeDx + lookX + 1.1} cy={eyeY - 0.8 + lookY} r={1.1} fill="#ffffff" opacity={0.95} />
                  </G>
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
          <Path d="M45 59 Q50 63 55 59" stroke="#0B4E3C" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        ) : (
          <Path d="M44 59 Q50 65 56 59" stroke="#0B4E3C" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        )}
      </Svg>
    </Animated.View>
  );
}
