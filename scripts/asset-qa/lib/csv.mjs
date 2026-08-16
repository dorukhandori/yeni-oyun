/**
 * Minimal RFC4180-ish CSV reader for public/assets/assets.csv.
 *
 * Zero dependencies on purpose: this manifest is small, hand-edited, and the
 * only quoting we ever need is "field contains a comma". Pulling in a CSV
 * library for 60 lines would be a worse trade than owning this file.
 *
 * Lines whose first non-space character is `#` are treated as comments
 * (assets.csv uses them as an inline spec header — see pipeline.md §7).
 */

/** @returns {string[]} */
export function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * @param {string} text raw file contents
 * @returns {{ header: string[], rows: Array<Record<string,string> & { __line: number }> }}
 */
export function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  let header = null;
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    if (raw.trimStart().startsWith("#")) continue;
    const cells = splitCsvLine(raw);
    if (!header) {
      header = cells;
      continue;
    }
    /** @type {Record<string, string> & { __line: number }} */
    const row = { __line: i + 1 };
    header.forEach((key, idx) => {
      row[key] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return { header: header ?? [], rows };
}
