// Browser-only OCR. tesseract.js is lazy-loaded so it never enters the server bundle.

export const SAMPLE_REGISTERS: { name: string; program: string; lines: string[] }[] = [
  {
    name: "sample-ncd-register.png", program: "NCD",
    lines: [
      "NCD CLINIC REGISTER - PHC DEMO", "Date: 18/10/2026", "",
      "Name: Rekha Devi", "Age: 43  Sex: F", "Village: Rampur", "Phone: 9876500011",
      "BP: 138/88  FBS: 118", "Diagnosis: Hypertension follow-up", "Rx: Amlodipine 5mg OD", "",
      "Name: Mohan Lal", "Age: 61  Sex: M", "Village: Sitapur",
      "BP: 160/100", "Diagnosis: Hypertension - new", "Rx: Telmisartan 40mg OD",
    ],
  },
  {
    name: "sample-lab-report.png", program: "LAB",
    lines: [
      "PHC LABORATORY REPORT (DEMO)", "Date: 22/10/2026",
      "Name: Suresh Kumar", "Age: 58  Sex: M", "Village: Lakhanpur",
      "FBS: 136", "HbA1c: 7.2", "Hb: 13.1", "Diagnosis: Diabetes - improving",
    ],
  },
  {
    name: "sample-anc-register.png", program: "RCH",
    lines: [
      "RCH / ANC REGISTER (DEMO)", "Date: 25/10/2026",
      "Name: Anita Yadav", "Age: 26  Sex: F", "Village: Rampur",
      "Complaints: ANC 3rd visit, mild swelling of feet", "BP: 118/76  Hb: 10.9", "Rx: IFA, Calcium",
    ],
  },
];

/** Draw a sample register to a PNG so the real OCR pipeline can read it. */
export async function renderSampleFile(i: number): Promise<File> {
  const s = SAMPLE_REGISTERS[i];
  const c = document.createElement("canvas");
  c.width = 1100; c.height = 90 + s.lines.length * 46;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#c9c2ad";
  for (let y = 70; y < c.height; y += 46) { g.beginPath(); g.moveTo(30, y + 10); g.lineTo(c.width - 30, y + 10); g.stroke(); }
  g.fillStyle = "#1d2433"; g.font = "30px Arial";
  s.lines.forEach((l, k) => g.fillText(l, 50, 70 + k * 46));
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
  return new File([blob], s.name, { type: "image/png" });
}

export function sampleTextFor(fileName: string): string {
  const hit = SAMPLE_REGISTERS.find((s) => fileName.toLowerCase().includes(s.program.toLowerCase()));
  return (hit ?? SAMPLE_REGISTERS[0]).lines.join("\n");
}

export async function runOcr(file: File, onProgress: (p: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
