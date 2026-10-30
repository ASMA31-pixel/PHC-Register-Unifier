import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, UploadCloud, Wand2 } from "lucide-react";
import { AppShell, PageHeader, ProgramBadge, btn } from "@/components/AppShell";
import { actions, getState, useStore } from "@/lib/store";
import {
  FIELD_KEYS, FIELD_LABELS, PROGRAMS, buildSummary, findMatches, nextPatientId, parseOcrText,
  type ExtractedField, type FieldKey, type Program,
} from "@/lib/phc";
import { renderSampleFile, runOcr, sampleTextFor, SAMPLE_REGISTERS } from "@/lib/ocr";

type Search = { patient?: string };
export const Route = createFileRoute("/upload")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => (typeof s.patient === "string" ? { patient: s.patient } : {}),
  head: () => ({
    meta: [
      { title: "Upload & Extract · PHC Register Unifier" },
      { name: "description", content: "Upload register photos or PDFs, review extracted fields and save them to patient timelines." },
      { property: "og:title", content: "Upload & Extract · PHC Register Unifier" },
      { property: "og:description", content: "OCR-based extraction with staff review for PHC registers (demo)." },
    ],
  }),
  component: UploadPage,
});

type Draft = {
  fields: Record<FieldKey, ExtractedField>;
  program: Program; programConfidence: number;
  link: string; // "new" or existing patientId
  saved?: string;
};
type Item = {
  id: string; file: File; preview: string | null;
  status: "processing" | "review" | "error"; progress: number;
  mode: "ocr" | "sample"; note?: string; ocrText: string; entries: Draft[];
};

function UploadPage() {
  const { patient: prefill } = Route.useSearch();
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (id: string, fn: (i: Item) => Item) => setItems((xs) => xs.map((x) => (x.id === id ? fn(x) : x)));

  async function process(file: File) {
    const id = crypto.randomUUID();
    const ok = /image\/(png|jpe?g)|application\/pdf/.test(file.type);
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setItems((xs) => [{ id, file, preview, status: ok ? "processing" : "error", progress: 0, mode: "ocr", ocrText: "", entries: [], note: ok ? undefined : "Only JPG, PNG or PDF files are supported." }, ...xs]);
    if (!ok) return;

    let text = ""; let mode: Item["mode"] = "ocr"; let note: string | undefined;
    if (file.type === "application/pdf") {
      mode = "sample"; text = sampleTextFor(file.name);
      note = "PDF text recognition isn't enabled in this demo – showing a labelled SAMPLE extraction. Please check every field.";
    } else {
      try {
        text = await runOcr(file, (p) => update(id, (i) => ({ ...i, progress: p })));
      } catch {
        mode = "sample"; text = sampleTextFor(file.name);
        note = "Text recognition couldn't run (offline?) – showing a labelled SAMPLE extraction.";
      }
    }
    let parsed = parseOcrText(text);
    if (!parsed.some((e) => e.fields.name.value)) {
      note = (note ? note + " " : "") + "No 'Name:' labels were found in the recognised text. Fill the fields manually or try a clearer photo.";
    }
    if (!parsed.length) parsed = parseOcrText("");
    const patients = getState().patients;
    const entries: Draft[] = parsed.map((e) => {
      const m = findMatches({ name: e.fields.name.value, age: e.fields.age.value, village: e.fields.village.value }, patients);
      return { ...e, link: prefill && patients.some((p) => p.patientId === prefill) ? prefill : m[0]?.patient.patientId ?? "new" };
    });
    update(id, (i) => ({ ...i, status: "review", mode, note, ocrText: text, entries, progress: 1 }));
  }

  const onFiles = (fl: FileList | File[] | null) => { if (fl) Array.from(fl).forEach(process); };

  return (
    <AppShell>
      <PageHeader title="Upload & Extract" sub="Photos or scans of registers and lab reports. Everything is checked by staff before saving.">
        {prefill && <span className="text-sm rounded-md bg-secondary px-3 py-1.5">New entries will be linked to <b>{prefill}</b></span>}
      </PageHeader>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${drag ? "border-primary bg-accent" : "border-input bg-card hover:bg-muted"}`}>
        <UploadCloud className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-3 font-medium">Drop register photos, lab reports, or click to browse</p>
        <p className="text-sm text-muted-foreground">JPG, PNG or PDF · multiple files allowed</p>
        <input ref={inputRef} type="file" multiple accept="image/png,image/jpeg,application/pdf" className="hidden"
          onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">No files? Try a fictional sample:</span>
        {SAMPLE_REGISTERS.map((s, i) => (
          <button key={s.name} className={btn.outline} onClick={async () => process(await renderSampleFile(i))}>
            <Wand2 className="h-4 w-4" /> {s.program} sample
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {items.map((it) => <ItemCard key={it.id} item={it} onChange={(fn) => update(it.id, fn)} />)}
      </div>
    </AppShell>
  );
}

function ItemCard({ item, onChange }: { item: Item; onChange: (fn: (i: Item) => Item) => void }) {
  const [showText, setShowText] = useState(false);
  return (
    <div className={btn.card + " overflow-hidden"}>
      <div className="flex flex-wrap items-center gap-4 border-b p-4">
        {item.preview ? <img src={item.preview} alt="" className="h-16 w-24 rounded object-cover border" />
          : <div className="h-16 w-24 rounded border bg-muted grid place-items-center"><FileText className="h-6 w-6 text-muted-foreground" /></div>}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.file.name}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {item.status === "processing" && <><Loader2 className="h-4 w-4 animate-spin" /> Reading text… {Math.round(item.progress * 100)}%</>}
            {item.status === "review" && <>Ready for review · {item.entries.length} entr{item.entries.length === 1 ? "y" : "ies"}
              <span className={`rounded px-1.5 text-xs font-semibold ${item.mode === "ocr" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                {item.mode === "ocr" ? "OCR" : "SAMPLE EXTRACTION"}</span></>}
            {item.status === "error" && <span className="text-destructive">Error</span>}
          </div>
        </div>
        {item.ocrText && <button className={btn.outline} onClick={() => setShowText((v) => !v)}>{showText ? "Hide" : "Show"} raw text</button>}
      </div>
      {item.note && <div className="flex gap-2 bg-warning-soft p-3 text-sm"><AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />{item.note}</div>}
      {showText && <pre className="bg-muted p-4 text-xs whitespace-pre-wrap font-mono max-h-56 overflow-auto">{item.ocrText}</pre>}
      {item.status === "review" && (
        <div className="divide-y">
          {item.entries.map((d, idx) => (
            <EntryForm key={idx} idx={idx} draft={d} item={item}
              onChange={(nd) => onChange((i) => ({ ...i, entries: i.entries.map((e, k) => (k === idx ? nd : e)) }))} />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryForm({ idx, draft, item, onChange }: { idx: number; draft: Draft; item: Item; onChange: (d: Draft) => void }) {
  const patients = useStore((s) => s.patients);
  const user = useStore((s) => s.user)!;
  const f = draft.fields;
  const matches = findMatches({ name: f.name.value, age: f.age.value, village: f.village.value }, patients);
  const setField = (k: FieldKey, value: string) => onChange({ ...draft, fields: { ...f, [k]: { value, confidence: 1 } } });
  const missingRequired = !f.name.value.trim() || !f.date.value;

  function save() {
    let pid = draft.link;
    if (pid === "new") {
      pid = nextPatientId(getState().patients);
      actions.addPatient({
        patientId: pid, name: f.name.value.trim(), age: parseInt(f.age.value) || null, sex: f.sex.value,
        village: f.village.value.trim(), phone: f.phone.value.trim(), createdAt: new Date().toISOString(),
      });
    }
    const data: Partial<Record<FieldKey, string>> = {};
    FIELD_KEYS.forEach((k) => { if (f[k].value.trim()) data[k] = f[k].value.trim(); });
    actions.addVisit({
      id: crypto.randomUUID(), patientId: pid, date: f.date.value, program: draft.program, summary: buildSummary(data), data,
      sourceFile: item.file.name, ocrText: item.ocrText, extractionMode: item.mode, verifiedBy: user, verifiedAt: new Date().toISOString(),
    });
    onChange({ ...draft, link: pid, saved: pid });
  }

  if (draft.saved) {
    return (
      <div className="flex flex-wrap items-center gap-3 p-4 bg-success-soft text-sm">
        <CheckCircle2 className="h-5 w-5 text-success" /> Entry {idx + 1} ({f.name.value}) saved to
        <Link to="/patients/$id" params={{ id: draft.saved }} className="font-semibold underline">{draft.saved}</Link>
      </div>
    );
  }

  const field = (k: FieldKey, type = "text") => {
    const low = f[k].value && f[k].confidence < 0.7;
    return (
      <label key={k} className="block text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1">{FIELD_LABELS[k]}
          {low && <span title="Low confidence – please check" className="text-warning">? low confidence</span>}
          {f[k].value && f[k].confidence >= 0.7 && f[k].confidence < 1 && <span className="opacity-60">{Math.round(f[k].confidence * 100)}%</span>}
        </span>
        <input type={type} value={f[k].value} placeholder="Not captured from document"
          onChange={(e) => setField(k, e.target.value)}
          className={`${btn.input} mt-1 text-foreground ${low ? "field-low" : ""} ${!f[k].value ? "border-dashed" : ""}`} />
      </label>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xl">Entry {idx + 1}</h3>
        <ProgramBadge p={draft.program} />
        <span className="text-xs text-muted-foreground">Yellow fields need a closer look · blank = not found</span>
      </div>
      <section>
        <h4 className="text-sm font-semibold mb-2">Patient</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {field("name")}{field("age")}{field("sex")}{field("village")}{field("phone")}
        </div>
      </section>
      <section>
        <h4 className="text-sm font-semibold mb-2">Visit</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {field("date", "date")}
          <label className="block text-xs font-medium text-muted-foreground">Program
            {draft.programConfidence < 0.7 && <span className="text-warning"> ? guess</span>}
            <select value={draft.program} onChange={(e) => onChange({ ...draft, program: e.target.value as Program, programConfidence: 1 })}
              className={`${btn.input} mt-1 text-foreground ${draft.programConfidence < 0.7 ? "field-low" : ""}`}>
              {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          {field("complaints")}{field("diagnosis")}
          {field("bp")}{field("fbs")}{field("hb")}{field("hba1c")}
          <div className="col-span-2 md:col-span-4">{field("medicines")}</div>
        </div>
      </section>
      <section className="rounded-lg bg-muted p-4">
        <h4 className="text-sm font-semibold mb-2">Patient ID</h4>
        {matches.length > 0 ? (
          <div className="space-y-2">
            {matches.map((m) => (
              <label key={m.patient.patientId} className="flex items-start gap-2 text-sm">
                <input type="radio" checked={draft.link === m.patient.patientId} onChange={() => onChange({ ...draft, link: m.patient.patientId })} className="mt-1" />
                <span>Suggested existing patient: <b>{m.patient.patientId}</b> – {m.patient.name}, {m.patient.age ?? "?"}, {m.patient.village}
                  <span className="block text-xs text-muted-foreground">{m.reasons.join(" · ")} · match {Math.round(m.score * 100)}%</span></span>
              </label>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground mb-2">No likely match found among existing patients.</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={draft.link === "new"} onChange={() => onChange({ ...draft, link: "new" })} />
            Create new patient ({nextPatientId(patients)})
          </label>
          <span className="text-muted-foreground">or link to</span>
          <select value={draft.link !== "new" && !matches.some((m) => m.patient.patientId === draft.link) ? draft.link : ""}
            onChange={(e) => e.target.value && onChange({ ...draft, link: e.target.value })} className={btn.input + " w-auto"}>
            <option value="">another patient…</option>
            {patients.map((p) => <option key={p.patientId} value={p.patientId}>{p.patientId} – {p.name}</option>)}
          </select>
        </div>
      </section>
      <div className="flex items-center gap-3">
        <button className={btn.primary} disabled={missingRequired} onClick={save}>Approve & save to timeline</button>
        {missingRequired && <span className="text-sm text-warning">Name and visit date are required.</span>}
      </div>
    </div>
  );
}
