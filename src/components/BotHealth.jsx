import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Loader2, RefreshCw } from "lucide-react";

const DOT = { ok: "bg-emerald-500", warning: "bg-amber-500", critical: "bg-red-500" };
const LABEL = { ok: "Healthy", warning: "Needs attention", critical: "Problem" };

// Admin-only: latest hourly check of every active client's bot.
export default function BotHealth({ baseUrl }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const res = await fetch(`${baseUrl}/api/monitor/overview`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load bot health");
      setClients(data.clients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runNow = async () => {
    try {
      setRunning(true);
      await fetch(`${baseUrl}/api/monitor/run-now`, { method: "POST", credentials: "include" });
      await load();
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const problems = clients.filter((c) => c.health !== "ok").length;

  return (
    <Card className="p-5">
      <CardHeader className="p-0 mb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-3 text-slate-900">
            <Activity size={18} className="text-emerald-500" />
            <span className="text-lg font-medium">Bot health</span>
          </CardTitle>
          <Button size="sm" variant="outline" disabled={running} onClick={runNow}>
            {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="ml-2">Check now</span>
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {loading ? "Loading…" : clients.length === 0 ? "No checks yet — the first one runs within a few minutes of a server start." : problems === 0 ? "All bots look healthy." : `${problems} of ${clients.length} need a look.`}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="divide-y rounded-lg border">
          {clients.filter((c) => c.health !== "ok").map((c) => (
            <div key={c.clientId} className="p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${DOT[c.health]}`} />
                {c.name} <span className="text-xs font-normal text-slate-500">{LABEL[c.health]}</span>
              </div>
              <ul className="mt-1 ml-4 list-disc text-sm text-slate-600 space-y-0.5">
                {(c.alerts || []).map((a) => (
                  <li key={a.type}>{a.message}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
