import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { FileUp, Users, FileSpreadsheet, LogOut, Activity } from "lucide-react";
import { actions, useStore } from "@/lib/store";
import type { Program } from "@/lib/phc";

const NAV = [
  { to: "/upload", label: "Upload & Extract", icon: FileUp },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/export", label: "Program-wise Export", icon: FileSpreadsheet },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const user = useStore((s) => s.user);
  const nav = useNavigate();
  useEffect(() => { if (!user) nav({ to: "/" }); }, [user, nav]);
  if (!user) return null;

  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print bg-sidebar text-sidebar-foreground md:w-60 md:min-h-screen flex md:flex-col">
        <div className="hidden md:flex items-center gap-2 px-5 py-5">
          <Activity className="h-5 w-5" />
          <div>
            <div className="font-display text-lg leading-tight">Register Unifier</div>
            <div className="text-[11px] opacity-70">PHC demo prototype</div>
          </div>
        </div>
        <nav className="flex md:flex-col flex-1 overflow-x-auto px-2 md:px-3 gap-1 py-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap opacity-80 hover:opacity-100 hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent opacity-100 font-medium" }}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
          <button onClick={() => actions.logout()}
            className="md:mt-auto flex items-center gap-2 rounded-md px-3 py-2 text-sm opacity-80 hover:opacity-100 hover:bg-sidebar-accent whitespace-nowrap">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </nav>
        <div className="hidden md:block px-5 py-4 text-[11px] opacity-60 border-t border-sidebar-accent">
          Signed in as {user}<br />Fictional data · not for clinical use
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}

const PROG_CLS: Record<Program, string> = {
  OPD: "bg-prog-opd", NCD: "bg-prog-ncd", RCH: "bg-prog-rch", LAB: "bg-prog-lab", OTHER: "bg-prog-other",
};
export function ProgramBadge({ p }: { p: Program }) {
  return <span className={`${PROG_CLS[p]} text-primary-foreground rounded px-2 py-0.5 text-xs font-semibold tracking-wide`}>{p}</span>;
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export const btn = {
  primary: "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50",
  outline: "inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted disabled:opacity-50",
  input: "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring",
  card: "rounded-lg border bg-card",
};
