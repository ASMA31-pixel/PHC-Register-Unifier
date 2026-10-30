import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Printer, Info } from "lucide-react";
import { AppShell, PageHeader, btn } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { EXPORT_COLUMNS, PROGRAMS, exportRows, filterVisits, toCsv, type Program } from "@/lib/phc";

export const Route = createFileRoute("/export")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Program-wise Export · PHC Register Unifier" },
      { name: "description", content: "Generate register-style tables by program and date range, download CSV or print." },
      { property: "og:title", content: "Program-wise Export · PHC Register Unifier" },
      { property: "og:description", content: "Demo CSV and printable register exports for OPD, NCD, RCH and Lab." },
    ],
  }),
  component: ExportPage,
});

function ExportPage() {
  const visits = useStore((s) => s.visits);
  const patients = useStore((s) => s.patients);
  const [program, setProgram] = useState<Program | "ALL">("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [gen, setGen] = useState({ program: "ALL" as Program | "ALL", from: "", to: "" });

  const rows = exportRows(filterVisits(visits, gen.program, gen.from, gen.to), patients);

  function download() {
    const csv = toCsv([[...EXPORT_COLUMNS], ...rows]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `phc-demo-${gen.program.toLowerCase()}-register.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <PageHeader title="Program-wise Export" sub="Register-style tables built from verified timeline records." />
      <div className="no-print flex gap-2 rounded-md bg-warning-soft p-3 text-sm mb-5"><Info className="h-4 w-4 text-warning mt-0.5" />Demo export only – not integrated with official reporting systems.</div>
      <div className={btn.card + " no-print p-4 flex flex-wrap items-end gap-3 mb-6"}>
        <label className="text-sm">Program
          <select className={btn.input + " mt-1 w-36"} value={program} onChange={(e) => setProgram(e.target.value as Program | "ALL")}>
            <option value="ALL">All</option>{PROGRAMS.map((p) => <option key={p}>{p}</option>)}
          </select></label>
        <label className="text-sm">From<input type="date" className={btn.input + " mt-1"} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">To<input type="date" className={btn.input + " mt-1"} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className={btn.primary} onClick={() => setGen({ program, from, to })}>Generate table</button>
        <div className="flex gap-2 ml-auto">
          <button className={btn.outline} onClick={download} disabled={!rows.length}><Download className="h-4 w-4" /> Download CSV</button>
          <button className={btn.outline} onClick={() => window.print()} disabled={!rows.length}><Printer className="h-4 w-4" /> Print view</button>
        </div>
      </div>
      <h2 className="text-xl mb-2">{gen.program === "ALL" ? "All programs" : `${gen.program} register`} · {rows.length} rows
        {(gen.from || gen.to) && <span className="text-sm text-muted-foreground font-sans"> ({gen.from || "start"} → {gen.to || "today"})</span>}</h2>
      <div className={btn.card + " overflow-x-auto"}>
        <table className="w-full text-xs">
          <thead className="bg-muted text-left"><tr>{EXPORT_COLUMNS.map((c) => <th key={c} className="border px-2 py-2 font-semibold">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border px-2 py-1.5">{c}</td>)}</tr>)}
            {!rows.length && <tr><td colSpan={EXPORT_COLUMNS.length} className="p-6 text-center text-muted-foreground">No records for these filters.</td></tr>}</tbody>
        </table>
      </div>
    </AppShell>
  );
}
