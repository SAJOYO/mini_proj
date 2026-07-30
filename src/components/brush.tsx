import { Path } from 'react-native-svg';

import type { BrushStroke } from '@/lib/paint';

/**
 * 붓자국 묶음을 그립니다.
 *
 * 채움(fill)이 아니라 획(stroke)으로 그어야 붓 끝이 둥글게 남습니다.
 * 보통 <ClipPath>로 감싼 <G> 안에 넣어 부위 밖으로 삐져나가지 않게 씁니다.
 */
export function Brush({ strokes }: { strokes: BrushStroke[] }) {
  return (
    <>
      {strokes.map((s, i) => (
        <Path
          key={i}
          d={s.d}
          stroke={s.color}
          strokeWidth={s.width}
          strokeLinecap="round"
          fill="none"
          opacity={s.opacity}
        />
      ))}
    </>
  );
}
