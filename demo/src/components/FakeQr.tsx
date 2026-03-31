import { useMemo } from 'react';

function fnv1a(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isFinder(x: number, y: number, size: number) {
  const inSquare = (sx: number, sy: number) => x >= sx && x < sx + 7 && y >= sy && y < sy + 7;
  return inSquare(0, 0) || inSquare(size - 7, 0) || inSquare(0, size - 7);
}

function isFinderDark(x: number, y: number, size: number) {
  const inside = (sx: number, sy: number) => x - sx >= 0 && x - sx < 7 && y - sy >= 0 && y - sy < 7;
  const draw = (sx: number, sy: number) => {
    const lx = x - sx;
    const ly = y - sy;
    const outer = lx === 0 || lx === 6 || ly === 0 || ly === 6;
    const inner = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
    return outer || inner;
  };
  if (inside(0, 0)) return draw(0, 0);
  if (inside(size - 7, 0)) return draw(size - 7, 0);
  if (inside(0, size - 7)) return draw(0, size - 7);
  return false;
}

export default function FakeQr({ value, sizePx = 168 }: { value: string; sizePx?: number }) {
  const grid = 25;
  const cell = sizePx / grid;

  const dark = useMemo(() => {
    const seed = fnv1a(value);
    const cells: boolean[] = [];
    for (let y = 0; y < grid; y += 1) {
      for (let x = 0; x < grid; x += 1) {
        if (isFinder(x, y, grid)) {
          cells.push(isFinderDark(x, y, grid));
          continue;
        }
        const v = fnv1a(`${seed}-${x}-${y}`);
        const isDark = (v % 100) < 42;
        cells.push(isDark);
      }
    }
    return cells;
  }, [value]);

  return (
    <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`} className="rounded-2xl bg-white p-2">
      <rect x={0} y={0} width={sizePx} height={sizePx} fill="white" rx={18} />
      {dark.map((isDark, i) => {
        if (!isDark) return null;
        const x = i % grid;
        const y = Math.floor(i / grid);
        const px = x * cell + 8;
        const py = y * cell + 8;
        const w = cell * 0.92;
        return <rect key={i} x={px} y={py} width={w} height={w} fill="#0b0b10" rx={2} />;
      })}
    </svg>
  );
}
