import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Outline icons of the live site's mobile nav: 24 viewBox, stroke 1.7, round caps and joins. */
export type IconName = 'home' | 'movies' | 'resale' | 'tickets' | 'profile' | 'back';

export function Icon({ name, color, size = 21, flip }: { name: IconName; color: string; size?: number; flip?: boolean }) {
  const stroke = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      {name === 'home' ? <Path d="m3 10 9-7 9 7M5.5 9v12h13V9M9 21v-7h6v7" {...stroke} /> : null}
      {name === 'movies' ? (
        <>
          <Rect x={3} y={3} width={18} height={18} rx={2} {...stroke} />
          <Path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4" {...stroke} />
        </>
      ) : null}
      {name === 'resale' ? <Path d="M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4" {...stroke} /> : null}
      {name === 'tickets' ? (
        <>
          <Path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z" {...stroke} />
          <Path d="M12 7v2m0 3v2m0 3v1" {...stroke} />
        </>
      ) : null}
      {name === 'profile' ? (
        <>
          <Circle cx={12} cy={8} r={4} {...stroke} />
          <Path d="M4 21a8 8 0 0 1 16 0" {...stroke} />
        </>
      ) : null}
      {name === 'back' ? <Path d="M15 18l-6-6 6-6" {...stroke} strokeWidth={2} /> : null}
    </Svg>
  );
}
