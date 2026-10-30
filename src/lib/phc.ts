// Core domain logic: extraction parsing, record matching, CSV. Pure functions (tested).

export const PROGRAMS = ["OPD", "NCD", "RCH", "LAB", "OTHER"] as const;
export type Program = (typeof PROGRAMS)[number];

export const FIELD_KEYS = [
  "name", "age", "sex", "village", "phone",
  "date", "complaints", "diagnosis", "bp", "fbs", "hb", "hba1c", "medicines",
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Name", age: "Age", sex: "Sex", village: "Village", phone: "Phone",
  date: "Visit date", complaints: "Complaints", diagnosis: "Diagnosis",
  bp: "BP (mmHg)", fbs: "FBS (mg/dL)", hb: "Hb (g/dL)", hba1c: "HbA1c (%)", medicines: "Medicines",
};

export type ExtractedField = { value: string; confidence: number };
export type ExtractedEntry = {
  fields: Record<FieldKey, ExtractedField>;
  program: Program;
  programConfidence: number;
};

export type Patient = {
  patientId: string; name: string; age: number | null; sex: string; village: string; phone: string;
  createdAt: string;
};

export type Visit = {
  id: string; patientId: string; date: string; program: Program; summary: string;
  data: Partial<Record<FieldKey, string>>;
  sourceFile: string; ocrText: string; extractionMode: "ocr" | "sample";
  verifiedBy: string; verifiedAt: string;
};

const PATTERNS: Record<FieldKey, RegExp> = {
  name: /(?:patient\s*)?name\s*[:\-]\s*(.+)/i,
  age: /age\s*[:\-]\s*(\d{1,3})/i,
  sex: /(?:sex|gender)\s*[:\-]\s*([MF]\b|male|female|other)/i,
  village: /village\s*[:\-]\s*(.+)/i,
  phone: /(?:phone|mobile|mob)\s*[:\-]\s*([\d\s+\-]{8,})/i,
  date: /date\s*[:\-]\s*([0-9]{1,4}[\/\-.][0-9]{1,2}[\/\-.][0-9]{1,4})/i,
  complaints: /(?:complaints?|c\/o)\s*[:\-]\s*(.+)/i,
  diagnosis: /(?:diagnosis|dx|impression)\s*[:\-]\s*(.+)/i,
  bp: /\bbp\s*[:\-]?\s*(\d{2,3}\s*\/\s*\d{2,3})/i,
  fbs: /\b(?:fbs|fasting\s*sugar|rbs)\s*[:\-]?\s*(\d{2,3})/i,
  hb: /\b(?:hb|haemoglobin|hemoglobin)\s*[:\-]?\s*(\d{1,2}(?:\.\d)?)/i,
  hba1c: /hba1c\s*[:\-]?\s*(\d{1,2}(?:\.\d)?)/i,
  medicines: /(?:rx|medicines?|treatment|drugs?)\s*[:\-]\s*(.+)/i,
};

/** Normalise dates like 12/03/2026 or 2026-03-12 to ISO yyyy-mm-dd. */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return iso(y, +m[2], +m[1]); // Indian registers use dd/mm/yyyy
  }
  return null;
}
function iso(y: number, mo: number, d: number) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function scoreValue(key: FieldKey, v: string): number {
  let c = 0.92;
  if (/[^\w\s\/.,+\-()%]/.test(v)) c -= 0.3; // odd OCR glyphs
  if (key === "name" && (v.length < 3 || /\d/.test(v))) c -= 0.4;
  if (key === "age") { const n = +v; if (!(n > 0 && n < 110)) c -= 0.5; }
  if (key === "phone" && v.replace(/\D/g, "").length !== 10) c -= 0.35;
  return Math.max(0.1, Math.min(1, c));
}

export function inferProgram(text: string): { program: Program; confidence: number } {
  const t = text.toLowerCase();
  const rules: [Program, RegExp][] = [
    ["RCH", /\b(anc|pnc|pregnan|lmp|edd|immuni[sz]|rch|antenatal|tt dose)\b/],
    ["LAB", /\b(lab|hba1c|haemoglobin|hemoglobin|hb\b|cbc|urine|report|test result)/],
    ["NCD", /\b(ncd|hypertension|htn|diabet|dm\b|amlodipine|metformin|fbs)/],
    ["OPD", /\b(opd|fever|cough|cold|pain|diarrh)/],
  ];
  for (const [p, re] of rules) if (re.test(t)) return { program: p, confidence: 0.8 };
  return { program: "OTHER", confidence: 0.3 };
}

/** Parse OCR text into one or more register entries. A new entry starts at each "Name:" line. */
export function parseOcrText(text: string): ExtractedEntry[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const l of lines) {
    if (PATTERNS.name.test(l) && cur.some((x) => PATTERNS.name.test(x))) { blocks.push(cur); cur = []; }
    cur.push(l);
  }
  if (cur.length) blocks.push(cur);
  const header = blocks.length > 1 ? blocks[0].filter((l) => !PATTERNS.name.test(l)) : [];

  return blocks
    .filter((b) => b.some((l) => PATTERNS.name.test(l)) || blocks.length === 1)
    .map((b) => {
      const block = b.join("\n");
      const fields = {} as Record<FieldKey, ExtractedField>;
      for (const k of FIELD_KEYS) {
        let m = block.match(PATTERNS[k]);
        if (!m && k === "date") m = header.join("\n").match(PATTERNS.date);
        let v = m ? m[1].trim() : "";
        if (k === "hb" && /hba1c/i.test(m?.[0] ?? "")) v = "";
        if (k === "sex" && v) v = v[0].toUpperCase() === "F" ? "F" : v[0].toUpperCase() === "M" ? "M" : "Other";
        let conf = v ? scoreValue(k, v) : 0;
        if (k === "date" && v) {
          const d = normalizeDate(v);
          if (d) v = d; else conf = 0.35;
        }
        fields[k] = { value: v, confidence: conf };
      }
      const { program, confidence } = inferProgram(block + "\n" + header.join("\n"));
      return { fields, program, programConfidence: confidence };
    });
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}
export function similarity(a: string, b: string): number {
  const x = a.toLowerCase().replace(/[^a-z]/g, ""), y = b.toLowerCase().replace(/[^a-z]/g, "");
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

export type MatchSuggestion = { patient: Patient; score: number; reasons: string[] };

/** Heuristic: similar name (>=0.8) required, plus age within 2 years and/or similar village. */
export function findMatches(
  q: { name: string; age: string; village: string }, patients: Patient[],
): MatchSuggestion[] {
  const out: MatchSuggestion[] = [];
  for (const p of patients) {
    const ns = similarity(q.name, p.name);
    if (ns < 0.8) continue;
    const reasons = [ns === 1 ? "Same name" : "Similar name"];
    let score = ns * 0.5;
    const age = parseInt(q.age);
    if (!isNaN(age) && p.age != null) {
      if (Math.abs(age - p.age) <= 2) { score += 0.25; reasons.push("Age within 2 years"); }
      else score -= 0.2;
    }
    if (q.village && p.village && similarity(q.village, p.village) >= 0.8) { score += 0.25; reasons.push("Same village"); }
    if (score >= 0.6) out.push({ patient: p, score: Math.min(1, score), reasons });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function nextPatientId(patients: Patient[]): string {
  const max = patients.reduce((m, p) => Math.max(m, parseInt(p.patientId.replace(/\D/g, "")) || 0), 0);
  return `PHC-${String(max + 1).padStart(4, "0")}`;
}

export function buildSummary(d: Partial<Record<FieldKey, string>>): string {
  const parts: string[] = [];
  if (d.diagnosis) parts.push(d.diagnosis);
  if (d.bp) parts.push(`BP ${d.bp}`);
  if (d.fbs) parts.push(`FBS ${d.fbs}`);
  if (d.hb) parts.push(`Hb ${d.hb}`);
  if (d.hba1c) parts.push(`HbA1c ${d.hba1c}%`);
  if (d.medicines) parts.push(`Rx ${d.medicines}`);
  if (!parts.length && d.complaints) parts.push(d.complaints);
  return parts.join(" · ") || "Visit recorded";
}

export const EXPORT_COLUMNS = [
  "Date", "Patient ID", "Name", "Age", "Sex", "Village", "Program",
  "Complaints", "Diagnosis", "BP", "FBS", "Hb", "HbA1c", "Medicines",
] as const;

export function filterVisits(visits: Visit[], program: Program | "ALL", from?: string, to?: string) {
  return visits
    .filter((v) => (program === "ALL" || v.program === program) && (!from || v.date >= from) && (!to || v.date <= to))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function exportRows(visits: Visit[], patients: Patient[]): string[][] {
  const byId = new Map(patients.map((p) => [p.patientId, p]));
  return visits.map((v) => {
    const p = byId.get(v.patientId);
    return [
      v.date, v.patientId, p?.name ?? v.data.name ?? "", String(p?.age ?? v.data.age ?? ""), p?.sex ?? "",
      p?.village ?? "", v.program, v.data.complaints ?? "", v.data.diagnosis ?? "", v.data.bp ?? "",
      v.data.fbs ?? "", v.data.hb ?? "", v.data.hba1c ?? "", v.data.medicines ?? "",
    ];
  });
}

export function toCsv(rows: string[][]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}
