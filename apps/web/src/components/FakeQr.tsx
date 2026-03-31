"use client";

export default function FakeQr({ value }: { value: string }) {
  const size = 7;
  const cells: boolean[][] = [];
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      hash = ((hash * 16807) % 2147483647) | 0;
      row.push(hash % 3 !== 0);
    }
    cells.push(row);
  }

  const px = 20;
  const w = size * px;

  return (
    <svg
      width={w}
      height={w}
      viewBox={`0 0 ${w} ${w}`}
      className="rounded-xl"
    >
      <rect width={w} height={w} fill="#fff" />
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * px}
              y={r * px}
              width={px}
              height={px}
              fill="#111"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
