// Minimal CSV reader for spreadsheet exports: quoted fields (with commas, quotes and line breaks),
// "," or ";" delimiter (Excel uses ";" when the computer's list separator is ";"), BOM and CRLF.

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((v) => v.trim()));
}

/** "C$ 1,250.50" → 1250.5 (dot decimals, as used in Nicaragua). NaN when empty. */
export function parseAmount(value: string): number {
  const clean = value.replace(/[^\d.-]/g, "");
  return clean ? Number(clean) : NaN;
}
