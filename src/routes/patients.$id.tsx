import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileUp, X } from "lucide-react";
import { AppShell, PageHeader, ProgramBadge, btn } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { FIELD_KEYS, FIELD_LABELS, type Program, type Visit } from "@/lib/phc";

export const Route = createFileRoute("/patients/$id")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} timeline · PHC Register Unifier` },
      { name: "description", content: "Chronological timeline of a demo patient's visits across PHC programs." },
      { property: "og:title", content: `${params.id} timeline · PHC Register Unifier` },
      { property: "og:description", content: "Unified longitudinal patient timeline (demo, fictional data)." },
    ],
  }),
  component: PatientPage,
});

const FILTERS: (Program | "ALL")[] = ["ALL", "OPD", "NCD", "RCH", "LAB"];

function PatientPage() {
  const { id } = Route.useParams();
  const patient = useStore((s) => s.patients.find((p) => p.patientId === id));
  const allVisits = useStore((s) => s.visits);
  const [filter, setFilter] = useState<Program | "ALL">("ALL");
  const [open, setOpen] = useState<Visit | null>(null);

  if (!patient) return <AppShell><p>Patient {id} not found. <Link to="/patients" className="underline">Back to list</Link></p></AppShell>;
  const visits = allVisits.filter((v) => v.patientId === id).sort((a, b) => b.date.localeCompare(a.date));
  const shown = visits.filter((v) => filter === "ALL" || v.program === filter);

  return (
    <AppShell>
      <Link to="/patients" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-3"><ArrowLeft className="h-4 w-4" /> Patients</Link>
      <PageHeader title={patient.name} sub={`${patient.patientId} · ${patient.age ?? "?"} yrs / ${patient.sex || "?"} · ${patient.village || "village unknown"}${patient.phone ? " · " + patient.phone : ""}`}>
        <Link to="/upload" search={{ patient: patient.patientId }} className={btn.primary}><FileUp className="h-4 w-4" /> Upload document for this patient</Link>
      </PageHeader>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const n = f === "ALL" ? visits.length : visits.filter((v) => v.program === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-sm ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}>
              {f === "ALL" ? "All" : f === "LAB" ? "Lab only" : `${f} only`} <span className="opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      <ol className="relative border-l-2 border-border ml-2 space-y-4">
        {shown.map((v) => (
          <li key={v.id} className="ml-6">
            <span className="absolute -left-[7px] mt-4 h-3 w-3 rounded-full bg-primary" />
            <div className={btn.card + " p-4 flex flex-wrap items-center gap-3"}>
              <div className="font-mono text-sm w-24">{v.date}</div>
              <ProgramBadge p={v.program} />
              <div className="flex-1 min-w-[12rem] text-sm">{v.summary}</div>
              <button className={btn.outline} onClick={() => setOpen(v)}>View details</button>
            </div>
          </li>
        ))}
        {!shown.length && <li className="ml-6 text-sm text-muted-foreground">No visits for this filter.</li>}
      </ol>

      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/40 grid place-items-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-card rounded-xl max-w-lg w-full max-h-[85vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl flex-1">Visit {open.date}</h2><ProgramBadge p={open.program} />
              <button onClick={() => setOpen(null)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {FIELD_KEYS.filter((k) => open.data[k]).map((k) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{FIELD_LABELS[k]}</dt><dd>{open.data[k]}</dd></div>
              ))}
            </dl>
            <div className="mt-5 border-t pt-4 text-xs text-muted-foreground space-y-1">
              <div>Source: {open.sourceFile} · {open.extractionMode === "ocr" ? "OCR extraction" : "Sample extraction"}</div>
              <div>Verified by {open.verifiedBy} on {new Date(open.verifiedAt).toLocaleString()}</div>
            </div>
            <details className="mt-3 text-xs"><summary className="cursor-pointer">Original recognised text</summary>
              <pre className="mt-2 bg-muted p-3 rounded whitespace-pre-wrap font-mono">{open.ocrText}</pre></details>
          </div>
        </div>
      )}
    </AppShell>
  );
}
