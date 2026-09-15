import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, X } from "lucide-react";

const DAYS = [
  { value: "sun", label: "Sun" },
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
];

const emptyForm = { name: "", appointmentDurationMinutes: 30, workingHours: [] };

// Staff/doctors + their working hours. Once at least one active staff
// member exists here, the bot switches from "we'll email you" to actually
// checking real availability and booking the appointment itself.
export default function StaffManager({ clientId, baseUrl }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${baseUrl}/api/staff?clientId=${encodeURIComponent(clientId)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load staff");
      setStaff(Array.isArray(data.staff) ? data.staff : []);
    } catch (err) {
      setError(err.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setForm({
      name: s.name || "",
      appointmentDurationMinutes: s.appointmentDurationMinutes || 30,
      workingHours: (s.workingHours || []).map((h) => ({ ...h })),
    });
  };

  const addHourRow = () => {
    setForm((f) => ({
      ...f,
      workingHours: [...f.workingHours, { day: "sat", start: "10:00", end: "18:00" }],
    }));
  };

  const updateHourRow = (idx, field, value) => {
    setForm((f) => ({
      ...f,
      workingHours: f.workingHours.map((h, i) => (i === idx ? { ...h, [field]: value } : h)),
    }));
  };

  const removeHourRow = (idx) => {
    setForm((f) => ({ ...f, workingHours: f.workingHours.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Staff name is required");
      return;
    }
    if (!form.workingHours.length) {
      setError("Add at least one working-hours row");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `${baseUrl}/api/staff/${editingId}` : `${baseUrl}/api/staff`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId,
          name: form.name.trim(),
          appointmentDurationMinutes: form.appointmentDurationMinutes,
          workingHours: form.workingHours,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");

      resetForm();
      await fetchStaff();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${baseUrl}/api/staff/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Delete failed");
      setStaff((prev) => prev.filter((s) => s._id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  const summarizeHours = (hours) =>
    (hours || [])
      .map((h) => `${DAYS.find((d) => d.value === h.day)?.label || h.day} ${h.start}-${h.end}`)
      .join(" · ");

  return (
    <Card className="p-4 border-l-4 border-teal-600">
      <CardHeader className="p-0 mb-3">
        <CardTitle>Staff &amp; Hours</CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Add a doctor/staff member and their working hours — once at least one is here, the bot
          checks real availability and books appointments on its own instead of just emailing you.
        </p>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
        )}

        <div className="border rounded-xl p-4 bg-slate-50 space-y-3">
          <div className="text-sm font-medium text-slate-700">
            {editingId ? "Edit staff member" : "Add a staff member"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Name (e.g. Dr. Ahmed Kadah)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              type="number"
              min="5"
              step="5"
              placeholder="Appointment length (minutes)"
              value={form.appointmentDurationMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, appointmentDurationMinutes: Number(e.target.value) || 30 }))
              }
            />
          </div>

          <div className="space-y-2">
            {form.workingHours.map((h, idx) => (
              <div key={idx} className="flex items-center gap-2 flex-wrap">
                <select
                  value={h.day}
                  onChange={(e) => updateHourRow(idx, "day", e.target.value)}
                  className="border rounded p-2 text-sm bg-white"
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={h.start}
                  onChange={(e) => updateHourRow(idx, "start", e.target.value)}
                  className="border rounded p-2 text-sm bg-white"
                />
                <span className="text-sm text-slate-400">to</span>
                <input
                  type="time"
                  value={h.end}
                  onChange={(e) => updateHourRow(idx, "end", e.target.value)}
                  className="border rounded p-2 text-sm bg-white"
                />
                <Button variant="outline" size="sm" onClick={() => removeHourRow(idx)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addHourRow}>
              <Plus className="w-3 h-3" /> Add working hours
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Save changes" : "Add staff member"}
            </Button>
            {editingId && (
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading staff…
          </div>
        ) : staff.length === 0 ? (
          <div className="text-sm text-slate-500">
            No staff yet — the bot is still using the email-based booking flow until you add one.
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map((s) => (
              <div key={s._id} className="border rounded-lg bg-white p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">
                    {s.name}{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      ({s.appointmentDurationMinutes}m slots)
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{summarizeHours(s.workingHours)}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => startEdit(s)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(s._id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
