import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";

const FILTERS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
];

const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

function formatDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

// Real bookings made by the bot (via the Staff & Hours availability system),
// grouped by day, with cancel. Bookings are also WhatsApped to the business,
// but that's one-way — this is where the owner sees the full schedule.
export default function BookingsList({ clientId, baseUrl, totalConversations = 0 }) {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${baseUrl}/api/appointments?clientId=${encodeURIComponent(clientId)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load bookings");
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = async (id) => {
    if (!window.confirm("Cancel this booking? The time slot becomes available again.")) return;
    try {
      setBusyId(id);
      const res = await fetch(`${baseUrl}/api/appointments/${id}/cancel?clientId=${encodeURIComponent(clientId)}`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Cancel failed");
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;

  const groups = useMemo(() => {
    const today = todayStr();
    const visible = appointments.filter((a) =>
      filter === "all" ? true : filter === "upcoming" ? a.date >= today : a.date < today
    );
    const sorted = [...visible].sort((a, b) =>
      filter === "past"
        ? b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)
        : a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
    );
    const map = new Map();
    for (const a of sorted) {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date).push(a);
    }
    return [...map.entries()];
  }, [appointments, filter]);

  return (
    <Card className="p-5">
      <CardHeader className="p-0 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-3 text-slate-900">
            <CalendarDays size={18} className="text-violet-500" />
            <span className="text-lg font-medium">Bookings</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={filter === f.value ? "default" : "outline"}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={load} aria-label="Refresh bookings">
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {confirmedCount} confirmed {confirmedCount === 1 ? "booking" : "bookings"} from {totalConversations}{" "}
          {totalConversations === 1 ? "conversation" : "conversations"}
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-6">
            <Loader2 size={16} className="animate-spin" /> Loading bookings…
          </div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No {filter === "all" ? "" : filter} bookings yet.</p>
        ) : (
          <div className="space-y-5">
            {groups.map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">{formatDay(date)}</h3>
                <div className="divide-y rounded-lg border">
                  {items.map((a) => {
                    const cancelled = a.status === "cancelled";
                    return (
                      <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                        <div className={cancelled ? "opacity-50" : ""}>
                          <div className="text-sm font-medium text-slate-900">
                            {a.startTime}–{a.endTime}
                            {a.staffName && <span className="text-slate-500 font-normal"> · {a.staffName}</span>}
                          </div>
                          <div className="text-sm text-slate-600">
                            {a.customer.name || "Unnamed"}
                            {a.customer.phone && <span> · {a.customer.phone}</span>}
                          </div>
                          <div className="text-xs text-slate-400">
                            {a.bookingId} · via {a.channel}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              cancelled ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {cancelled ? "Cancelled" : "Confirmed"}
                          </span>
                          {!cancelled && (
                            <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => cancel(a.id)}>
                              {busyId === a.id ? <Loader2 size={14} className="animate-spin" /> : "Cancel"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
