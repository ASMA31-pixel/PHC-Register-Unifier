import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell, PageHeader, btn } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/patients/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Patients · PHC Register Unifier" },
      { name: "description", content: "Searchable list of unified demo patient records with last visit dates." },
      { property: "og:title", content: "Patients · PHC Register Unifier" },
      { property: "og:description", content: "Unified patient list across OPD, NCD, RCH and lab registers (demo)." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const patients = useStore((s) => s.patients);
  const visits = useStore((s) => s.visits);
  const [q, setQ] = useState("");
  const last = (id: string) => visits.filter((v) => v.patientId === id).map((v) => v.date).sort().at(-1) ?? "—";
  const count = (id: string) => visits.filter((v) => v.patientId === id).length;
  const list = patients.filter((p) => (p.name + " " + p.patientId + " " + p.village).toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <PageHeader title="Patients" sub={`${patients.length} patients · ${visits.length} verified visits`} />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input className={btn.input + " pl-9"} placeholder="Search name, ID or village" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className={btn.card + " overflow-x-auto"}>
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>{["Patient ID", "Name", "Age/Sex", "Village", "Visits", "Last visit"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.patientId} className="border-t hover:bg-muted/50">
                <td className="px-4 py-3 font-mono"><Link to="/patients/$id" params={{ id: p.patientId }} className="text-primary underline">{p.patientId}</Link></td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.age ?? "?"}/{p.sex || "?"}</td>
                <td className="px-4 py-3">{p.village || "—"}</td>
                <td className="px-4 py-3">{count(p.patientId)}</td>
                <td className="px-4 py-3">{last(p.patientId)}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No patients match “{q}”.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
