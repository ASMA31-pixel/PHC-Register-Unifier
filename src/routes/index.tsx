import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Info } from "lucide-react";
import { actions, DEMO_USER, useStore } from "@/lib/store";
import { btn } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · PHC Register Unifier (Demo)" },
      { name: "description", content: "Demo login for PHC Register Unifier – turn paper register photos into a unified patient timeline." },
      { property: "og:title", content: "PHC Register Unifier (Demo)" },
      { property: "og:description", content: "Digitise PHC registers into one longitudinal patient timeline. Hackathon prototype with fictional data." },
    ],
  }),
  component: Login,
});

function Login() {
  const user = useStore((s) => s.user);
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { if (user) nav({ to: "/upload" }); }, [user, nav]);

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12">
        <div className="flex items-center gap-2"><Activity className="h-5 w-5" /> Register Unifier</div>
        <div>
          <h1 className="text-5xl leading-tight">Many registers.<br />One patient story.</h1>
          <p className="mt-4 max-w-md opacity-80">Photograph OPD, NCD, RCH and lab registers, check what was read, and see every visit on a single timeline.</p>
        </div>
        <p className="text-xs opacity-60">Hackathon prototype · fictional patients · not a medical device or government system.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form className="w-full max-w-sm space-y-4" onSubmit={(e) => {
          e.preventDefault();
          if (!actions.login(email, pw)) setErr("Incorrect email or password.");
        }}>
          <h2 className="text-3xl">Staff sign in</h2>
          <div className="rounded-md bg-secondary text-secondary-foreground p-3 text-sm flex gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>Demo access: <b>{DEMO_USER.email}</b> / <b>{DEMO_USER.password}</b>
              <button type="button" className="block underline mt-1" onClick={() => { setEmail(DEMO_USER.email); setPw(DEMO_USER.password); }}>Fill demo credentials</button>
            </div>
          </div>
          <label className="block text-sm">Email<input className={btn.input + " mt-1"} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block text-sm">Password<input type="password" className={btn.input + " mt-1"} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button className={btn.primary + " w-full justify-center"}>Login</button>
        </form>
      </div>
    </div>
  );
}
