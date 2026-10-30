import { useSyncExternalStore } from "react";
import type { Patient, Visit } from "./phc";
import { buildSummary } from "./phc";

// Demo persistence in the browser (localStorage). Fictional data only.
type State = { patients: Patient[]; visits: Visit[]; user: string | null };
const KEY = "phc-unifier-v1";
export const DEMO_USER = { email: "demo@phc.local", password: "demo123" };

function seed(): State {
  const now = "2026-10-01T09:00:00.000Z";
  const patients: Patient[] = [
    { patientId: "PHC-0001", name: "Rekha Devi", age: 42, sex: "F", village: "Rampur", phone: "9876500011", createdAt: now },
    { patientId: "PHC-0002", name: "Suresh Kumar", age: 58, sex: "M", village: "Lakhanpur", phone: "9876500022", createdAt: now },
    { patientId: "PHC-0003", name: "Anita Yadav", age: 26, sex: "F", village: "Rampur", phone: "", createdAt: now },
  ];
  const mk = (id: string, pid: string, date: string, program: Visit["program"], data: Visit["data"]): Visit => ({
    id, patientId: pid, date, program, data, summary: buildSummary(data), sourceFile: "seed-register.png",
    ocrText: "(seeded demo record)", extractionMode: "sample", verifiedBy: DEMO_USER.email, verifiedAt: now,
  });
  const visits = [
    mk("v1", "PHC-0001", "2026-03-14", "OPD", { complaints: "Headache, giddiness", bp: "150/94", diagnosis: "Raised BP – review" }),
    mk("v2", "PHC-0001", "2026-04-02", "NCD", { diagnosis: "Hypertension", bp: "146/90", medicines: "Amlodipine 5mg OD" }),
    mk("v3", "PHC-0001", "2026-04-02", "LAB", { fbs: "112", hb: "11.2" }),
    mk("v4", "PHC-0001", "2026-07-10", "NCD", { diagnosis: "Hypertension – controlled", bp: "132/84", medicines: "Amlodipine 5mg OD" }),
    mk("v5", "PHC-0002", "2026-05-20", "NCD", { diagnosis: "Type 2 Diabetes", fbs: "168", medicines: "Metformin 500mg BD" }),
    mk("v6", "PHC-0002", "2026-08-21", "LAB", { hba1c: "7.8", fbs: "142" }),
    mk("v7", "PHC-0003", "2026-06-05", "RCH", { complaints: "ANC 2nd visit", bp: "110/70", hb: "10.4", medicines: "IFA tablets" }),
  ];
  return { patients, visits, user: null };
}

let state: State = load();
const listeners = new Set<() => void>();
function load(): State {
  if (typeof window === "undefined") return seed();
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return seed();
}
function set(next: Partial<State>) {
  state = { ...state, ...next };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  listeners.forEach((l) => l());
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => sel(state), () => sel(state),
  );
}
export const getState = () => state;

export const actions = {
  login(email: string, password: string) {
    if (email.trim().toLowerCase() === DEMO_USER.email && password === DEMO_USER.password) { set({ user: DEMO_USER.email }); return true; }
    return false;
  },
  logout: () => set({ user: null }),
  addPatient: (p: Patient) => set({ patients: [...state.patients, p] }),
  addVisit: (v: Visit) => set({ visits: [...state.visits, v] }),
  reset: () => set({ ...seed(), user: state.user }),
};
