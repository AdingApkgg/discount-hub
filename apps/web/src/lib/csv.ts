/** 简洁 CSV 序列化：转义双引号、换行、逗号；UTF-8 BOM 便于 Excel 正确识别中文 */

export type CsvRow = Record<string, unknown>;

function escapeCell(v: unknown): string {
  if (v == null) return "";
  const s =
    typeof v === "object"
      ? JSON.stringify(v)
      : typeof v === "string"
        ? v
        : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: CsvRow[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCell(r[c.key])).join(","))
    .join("\n");
  return `\uFEFF${header}\n${body}`;
}
