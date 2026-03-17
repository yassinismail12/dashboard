import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MessageSquare, Users, Gauge, PlusCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const API = "https://serverowned.onrender.com";
const BOT_TYPE = "default";

const BUSINESS_TYPE_OPTIONS = [
  { value: "default", label: "General Business" },
  { value: "restaurant", label: "Restaurant / Cafe / Bakery" },
  { value: "realestate", label: "Real Estate" },
  { value: "clinic", label: "Clinic / Dental / Hospital" },
  { value: "salon", label: "Salon / Spa / Gym" },
  { value: "ecommerce", label: "E-commerce / Retail / Pharmacy" },
  { value: "hotel", label: "Hotel / Hostel" },
  { value: "education", label: "Education / Academy / School" },
  { value: "automotive", label: "Automotive / Showroom" },
];

const RAW_SECTION_OPTIONS = [
  { value: "mixed", label: "Mixed / not sure" },
  { value: "profile", label: "Business profile / about" },
  { value: "contact", label: "Contact information" },
  { value: "hours", label: "Business hours" },
  { value: "faqs", label: "FAQs" },
  { value: "offers", label: "Services / offers / pricing" },
  { value: "menu", label: "Menu" },
  { value: "products", label: "Products / catalog" },
  { value: "listings", label: "Listings / properties / items" },
  { value: "paymentPlans", label: "Payment / installment plans" },
  { value: "booking", label: "Bookings / appointments" },
  { value: "team", label: "Team / doctors / staff" },
  { value: "courses", label: "Courses / programs" },
  { value: "rooms", label: "Rooms / accommodation" },
  { value: "delivery", label: "Delivery / shipping" },
  { value: "policies", label: "Policies" },
  { value: "other", label: "Other information" },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    used: 0,
    quota: 1000,
    weeklyData: [],
    clients: [],
  });

  const [showConvoModal, setShowConvoModal] = useState(false);
  const [currentConvos, setCurrentConvos] = useState([]);
  const [mode, setMode] = useState("weekly");
  const [chartData, setChartData] = useState([]);
  const [selectedSource, setSelectedSource] = useState("all");

  const [conversationStats, setConversationStats] = useState({
    totalConversations: 0,
    avgMessages: 0,
    activeToday: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [form, setForm] = useState({ name: "", email: "", quota: 1000 });
  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);

  // ── Bot Build state (mirrors ClientDashboard) ──────────────────────────────
  const [showBuildSection, setShowBuildSection] = useState(false);
  const [buildMode, setBuildMode] = useState("form");
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [buildSuccess, setBuildSuccess] = useState("");
  const [replaceOldKnowledge, setReplaceOldKnowledge] = useState(true);
  const [coverageWarnings, setCoverageWarnings] = useState([]);
  const [sectionsPresent, setSectionsPresent] = useState([]);
  const [botReady, setBotReady] = useState(false);
  const [knowledgeVersion, setKnowledgeVersion] = useState(0);
  const [knowledgeStatusRaw, setKnowledgeStatusRaw] = useState("");

  const [promptSettings, setPromptSettings] = useState({
    tone: "friendly",
    orderFlowEnabled: true,
    humanEscalationEnabled: true,
    tourFlowEnabled: true,
    businessType: "default",
  });

  const [botForm, setBotForm] = useState({
    businessName: "",
    businessType: "",
    cityArea: "",
    about: "",
    hours: "",
    phoneWhatsapp: "",
    email: "",
    address: "",
    services: "",
    pricing: "",
    menu: "",
    products: "",
    faqs: "",
    listingsSummary: "",
    paymentPlans: "",
    booking: "",
    team: "",
    courses: "",
    rooms: "",
    delivery: "",
    policies: "",
  });

  const [rawSection, setRawSection] = useState("mixed");
  const [rawText, setRawText] = useState("");
  const [rawFile, setRawFile] = useState(null);
  // ──────────────────────────────────────────────────────────────────────────

  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
      navigate("/");
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchConversationStats();
  }, []);

  useEffect(() => {
    if (showConvoModal && editingClient?.clientId) {
      viewClientConvos(editingClient.clientId);
    }
  }, [selectedSource, showConvoModal]);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await fetch(`${API}/api/stats?mode=${mode}`, { credentials: "include" });
        const data = await res.json();
        const results = data.chartResults || [];
        let normalized = [];
        if (mode === "daily") {
          normalized = results.map((d) => ({ label: `${d._id}:00`, messages: d.count }));
        } else if (mode === "weekly") {
          const daysMap = { 1: "Sun", 2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat" };
          normalized = results.map((d) => ({ label: daysMap[d._id] || d._id, messages: d.count }));
        } else if (mode === "monthly") {
          normalized = results.map((d) => ({ label: d._id.toString(), messages: d.count }));
        }
        setChartData(normalized);
      } catch (err) {
        console.error("Error fetching chart data:", err);
      }
    };
    fetchChartData();
  }, [mode]);

  // reset build state whenever dialog opens/closes or build mode changes
  useEffect(() => {
    setBuildError("");
    setBuildSuccess("");
  }, [buildMode, showBuildSection]);

  async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, { ...options, credentials: "include" });
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return await res.json();
      } catch (err) {
        console.warn(`Retry ${i + 1}/${retries} failed:`, err.message);
        if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
        else throw err;
      }
    }
  }

  async function fetchStats() {
    try {
      const data = await fetchWithRetry(`${API}/api/stats`);
      setStats(data);
    } catch (err) {
      console.error("Stats failed after retries:", err);
    }
  }

  async function fetchConversationStats() {
    try {
      const data = await fetchWithRetry(`${API}/api/conversations`);
      if (Array.isArray(data)) {
        const total = data.length;
        const avg = total > 0 ? Math.round(data.reduce((sum, c) => sum + (c.history?.length || 0), 0) / total) : 0;
        const today = data.filter((c) => {
          const updated = new Date(c.updatedAt);
          const now = new Date();
          return (
            updated.getDate() === now.getDate() &&
            updated.getMonth() === now.getMonth() &&
            updated.getFullYear() === now.getFullYear()
          );
        }).length;
        setConversationStats({ totalConversations: total, avgMessages: avg, activeToday: today });
      }
    } catch (err) {
      console.error("Conversations failed after retries:", err);
    }
  }

  // ── Bot knowledge gate (for the currently-edited client) ──────────────────
  const fetchKnowledgeGate = async (clientId, effectiveBotType = "default") => {
    try {
      if (!clientId) return;

      const r1 = await fetch(`${API}/api/clients/${clientId}`, { credentials: "include" });
      const c1 = await r1.json().catch(() => ({}));

      if (r1.ok) {
        const v = Number(c1?.knowledgeVersion || c1?.knowledge?.version || 0) || 0;
        const status = String(c1?.knowledgeStatus || c1?.knowledge?.status || c1?.botStatus || "").trim();
        setCoverageWarnings(Array.isArray(c1?.coverageWarnings) ? c1.coverageWarnings : []);
        setSectionsPresent(Array.isArray(c1?.sectionsPresent) ? c1.sectionsPresent : []);
        const built =
          Boolean(c1?.botBuilt) ||
          Boolean(c1?.knowledgeReady) ||
          status === "ready" ||
          status === "needs_review" ||
          v >= 1;
        setKnowledgeVersion(v);
        setKnowledgeStatusRaw(status || (built ? "ready" : "empty"));
        setBotReady(built);
        return;
      }

      const r2 = await fetch(
        `${API}/api/knowledge/status?clientId=${encodeURIComponent(clientId)}&botType=${encodeURIComponent(effectiveBotType)}`,
        { credentials: "include" }
      );
      const j2 = await r2.json().catch(() => ({}));
      if (r2.ok && j2) {
        const v = Number(j2?.version || j2?.knowledgeVersion || 0) || 0;
        const status = String(j2?.status || j2?.knowledgeStatus || "").trim();
        const built = status === "ready" || status === "needs_review" || v >= 1;
        setKnowledgeVersion(v);
        setKnowledgeStatusRaw(status || (built ? "ready" : "empty"));
        setBotReady(built);
        setCoverageWarnings(Array.isArray(j2?.coverageWarnings) ? j2.coverageWarnings : []);
        setSectionsPresent(Array.isArray(j2?.sectionsPresent) ? j2.sectionsPresent : []);
      } else {
        setBotReady(false);
        setKnowledgeStatusRaw("unknown");
        setCoverageWarnings([]);
        setSectionsPresent([]);
      }
    } catch (e) {
      console.error("fetchKnowledgeGate error:", e);
      setBotReady(false);
      setKnowledgeStatusRaw("unknown");
      setCoverageWarnings([]);
      setSectionsPresent([]);
    }
  };

  const effectiveBotType =
    String(promptSettings.businessType || "").trim() ||
    String(botForm.businessType || "").trim() ||
    BOT_TYPE;

  const submitBuild = async () => {
    const clientId = editingClient?.clientId;
    if (!clientId) return;

    try {
      setBuildError("");
      setBuildSuccess("");
      setBuildLoading(true);

      if (buildMode === "form") {
        const hasAny = Object.values(botForm).some((v) => String(v || "").trim());
        if (!hasAny) {
          setBuildError("Please fill at least one field to build your bot.");
          return;
        }
      }
      if (buildMode === "paste" && !rawText.trim()) { setBuildError("Paste your text first."); return; }
      if (buildMode === "upload" && !rawFile) { setBuildError("Upload a .txt file first."); return; }

      let ok = false;
      let lastJson = null;

      if (buildMode === "form" || buildMode === "paste") {
        const payload =
          buildMode === "form"
            ? {
                clientId,
                botType: effectiveBotType,
                inputType: "form",
                replace: Boolean(replaceOldKnowledge),
                promptConfig: {
                  businessName: botForm.businessName,
                  businessType: effectiveBotType,
                  tone: promptSettings.tone,
                  humanEscalation: { enabled: promptSettings.humanEscalationEnabled, token: "[Human_request]" },
                  orderFlow: { enabled: promptSettings.orderFlowEnabled, token: "[ORDER_REQUEST]" },
                  tourFlow: { enabled: promptSettings.tourFlowEnabled, token: "[TOUR_REQUEST]" },
                },
                data: {
                  businessName: botForm.businessName,
                  businessType: botForm.businessType || effectiveBotType,
                  cityArea: botForm.cityArea,
                  about: botForm.about,
                  hours: botForm.hours,
                  phoneWhatsapp: botForm.phoneWhatsapp,
                  email: botForm.email,
                  address: botForm.address,
                  services: botForm.services,
                  pricing: botForm.pricing,
                  menu: botForm.menu,
                  products: botForm.products,
                  faqs: botForm.faqs,
                  listingsSummary: botForm.listingsSummary,
                  paymentPlans: botForm.paymentPlans,
                  booking: botForm.booking,
                  team: botForm.team,
                  courses: botForm.courses,
                  rooms: botForm.rooms,
                  delivery: botForm.delivery,
                  policies: botForm.policies,
                },
              }
            : {
                clientId,
                botType: effectiveBotType,
                inputType: "text",
                replace: Boolean(replaceOldKnowledge),
                section: rawSection,
                text: rawText,
              };

        try {
          const res = await fetch(`${API}/api/knowledge/build`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
          const json = await res.json().catch(() => ({}));
          lastJson = json;
          if (res.ok && (json.ok || json.success || json.status === "ok")) ok = true;
        } catch { /* fallthrough */ }
      }

      if (!ok && buildMode === "upload") {
        try {
          const fd = new FormData();
          fd.append("clientId", clientId);
          fd.append("section", rawSection);
          fd.append("botType", effectiveBotType);
          fd.append("replace", String(Boolean(replaceOldKnowledge)));
          fd.append("file", rawFile);

          const res = await fetch(`${API}/api/knowledge/upload`, {
            method: "POST",
            credentials: "include",
            body: fd,
          });
          const json = await res.json().catch(() => ({}));
          lastJson = json;
          if (res.ok && (json.ok || json.success || json.status === "ok")) ok = true;
        } catch { /* fallthrough */ }
      }

      if (!ok) {
        const res = await fetch(`${API}/api/knowledge/rebuild/${encodeURIComponent(clientId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ botType: effectiveBotType, replace: Boolean(replaceOldKnowledge) }),
        });
        const json = await res.json().catch(() => ({}));
        lastJson = json;
        if (res.ok) ok = Boolean(json.ok ?? json.success ?? true);
      }

      if (!ok) {
        setBuildError(`Build failed. Server response:\n${JSON.stringify(lastJson || {}, null, 2).slice(0, 1200)}`);
        return;
      }

      setBuildSuccess("✅ Bot built successfully.");
      await fetchKnowledgeGate(clientId, effectiveBotType);
    } catch (e) {
      setBuildError(e?.message || "Build failed.");
    } finally {
      setBuildLoading(false);
    }
  };

  const buildBadge = () => {
    if (knowledgeStatusRaw === "ready" || botReady) return "ready";
    if (knowledgeStatusRaw === "unknown") return "unknown";
    if (knowledgeStatusRaw === "needs_review") return "needs review";
    return "not built";
  };

  const buildBadgeClass = () => {
    if (knowledgeStatusRaw === "ready" || botReady) return "bg-green-100 text-green-700 border-green-200";
    if (knowledgeStatusRaw === "unknown") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (knowledgeStatusRaw === "needs_review") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-red-100 text-red-700 border-red-200";
  };
  // ──────────────────────────────────────────────────────────────────────────

  const viewClientConvos = async (clientOrId) => {
    try {
      const clientId = typeof clientOrId === "string" ? clientOrId : clientOrId.clientId;
      if (typeof clientOrId === "object") {
        setEditingClient(clientOrId);
      } else {
        const found = stats.clients?.find((c) => c.clientId === clientId);
        if (found) setEditingClient(found);
        else setEditingClient({ clientId });
      }
      const query = selectedSource === "all" ? "" : `?source=${selectedSource}`;
      const res = await fetch(`${API}/api/conversations/${clientId}${query}`, { credentials: "include" });
      const data = await res.json();
      setCurrentConvos(data || []);
      setShowConvoModal(true);
    } catch (err) {
      console.error("Error fetching client conversations:", err);
    }
  };

  const exportConvos = (convos, format = "json") => {
    if (!convos || !convos.length) return;
    let dataStr = "";
    let fileName = "";
    if (format === "json") {
      dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(convos, null, 2));
      fileName = "conversations.json";
    } else {
      const rows = [];
      convos.forEach((c, idx) => {
        (c.history || []).forEach((msg) => {
          rows.push([idx, msg.role, String(msg.content || "").replace(/,/g, " ")]);
        });
      });
      dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.map((r) => r.join(",")).join("\n"));
      fileName = "conversations.csv";
    }
    const dl = document.createElement("a");
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", fileName);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  const addFile = () => setFiles([...files, { file: null, name: "" }]);
  const updateFile = (index, key, value) => {
    const updated = [...files];
    updated[index][key] = value;
    setFiles(updated);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingClient(null);
    setForm({ name: "", email: "", quota: 1000 });
    setFiles([]);
    setExistingFiles([]);
    // reset build state
    setShowBuildSection(false);
    setBuildMode("form");
    setBuildError("");
    setBuildSuccess("");
    setBotReady(false);
    setKnowledgeVersion(0);
    setKnowledgeStatusRaw("");
    setCoverageWarnings([]);
    setSectionsPresent([]);
    setPromptSettings({ tone: "friendly", orderFlowEnabled: true, humanEscalationEnabled: true, tourFlowEnabled: true, businessType: "default" });
    setBotForm({
      businessName: "", businessType: "", cityArea: "", about: "", hours: "",
      phoneWhatsapp: "", email: "", address: "", services: "", pricing: "",
      menu: "", products: "", faqs: "", listingsSummary: "", paymentPlans: "",
      booking: "", team: "", courses: "", rooms: "", delivery: "", policies: "",
    });
    setRawSection("mixed");
    setRawText("");
    setRawFile(null);
    setReplaceOldKnowledge(true);
  };

  const deleteFile = async (fileId) => {
    try {
      const clientId = editingClient?.clientId || form.clientId;
      if (!clientId) { console.error("Cannot delete file: missing clientId."); return; }
      const res = await fetch(`${API}/clients/${clientId}/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { console.error("Error deleting file:", data); return; }
      setExistingFiles((prev) => prev.filter((f) => f._id !== fileId));
      await fetchStats();
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  };

  const saveClient = async () => {
    try {
      const url =
        editingClient && editingClient.clientId
          ? `${API}/api/clients/${editingClient.clientId}`
          : `${API}/api/clients`;
      const method = editingClient && editingClient.clientId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const resJson = await res.json();
      if (!res.ok) { console.error("Save failed:", resJson); return; }

      const savedClient = resJson.client ? resJson.client : resJson;
      const savedClientId = savedClient.clientId;

      for (const f of files) {
        if (!f.file || !f.name) continue;
        const formData = new FormData();
        formData.append("file", f.file);
        formData.append("name", f.name);
        const upRes = await fetch(`${API}/upload/${savedClientId}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!upRes.ok) {
          const upErr = await upRes.json().catch(() => ({}));
          console.error("File upload failed:", upErr);
        }
      }

      await fetchStats();
      resetForm();
    } catch (err) {
      console.error("Error saving client:", err);
    }
  };

  const deleteClient = async (clientId) => {
    try {
      const res = await fetch(`${API}/api/clients/${clientId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const err = await res.json().catch(() => ({})); console.error("Delete failed:", err); return; }
      await fetchStats();
      if (editingClient && editingClient.clientId === clientId) resetForm();
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  async function renewClient(clientId) {
    try {
      await fetch(`${API}/admin/renew/${clientId}`, { method: "POST", credentials: "include" });
      await fetchStats();
    } catch (err) {
      console.error("Failed to renew client", err);
    }
  }

  async function renewAllClients() {
    try {
      await fetch(`${API}/admin/renew-all`, { method: "POST", credentials: "include" });
      await fetchStats();
    } catch (err) {
      console.error("Failed to renew all clients", err);
    }
  }

  const handleLogout = async () => {
    try {
      const res = await fetch(`${API}/api/logout`, { method: "POST", credentials: "include" });
      if (res.ok) navigate("/");
      else console.error("Logout failed");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const { totalClients, used, quota, clients } = stats;
  const remaining = quota - used;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Messages Dashboard</h1>
            <p className="text-slate-500 mt-1">Weekly activity and usage at a glance.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-slate-500">Logged in</div>
            </div>
            <Button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <Users size={18} className="text-sky-500" />
                <div className="text-sm">Total Clients</div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{totalClients}</div>
              <p className="text-slate-500 text-sm mt-1">Active this month</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <MessageSquare size={18} className="text-sky-500" />
                <div className="text-sm">Messages Used</div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{used.toLocaleString()}</div>
              <p className="text-slate-500 text-sm mt-1">Out of {quota.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <Gauge size={18} className="text-sky-500" />
                <div className="text-sm">Remaining Quota</div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{remaining.toLocaleString()}</div>
              <p className="text-slate-500 text-sm mt-1">{((remaining / quota) * 100).toFixed(0)}% left</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <MessageSquare size={18} className="text-sky-500" />
                <div className="text-sm">Conversations</div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{conversationStats.totalConversations}</div>
              <p className="text-slate-500 text-sm mt-1">
                Avg {conversationStats.avgMessages} msgs • {conversationStats.activeToday} active today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Gauge size={18} className="text-sky-500" />
              <div>
                <h2 className="text-lg font-medium text-slate-900">Message Activity</h2>
                <p className="text-slate-500 text-sm">Track messages by timeframe</p>
              </div>
            </div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="basis" dataKey="messages" stroke="#2563eb" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Client Management */}
        <Card className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Users size={18} className="text-sky-500" />
              <h2 className="text-xl font-semibold text-slate-900">Client Management</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base w-full sm:w-auto"
                onClick={() => { resetForm(); setShowForm(true); }}
              >
                <PlusCircle size={16} />
                Add Client
              </Button>
              <Button onClick={renewAllClients} className="flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base w-full sm:w-auto">
                Renew All Clients
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-100 bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-slate-600">Client</TableHead>
                  <TableHead className="text-slate-600">Email</TableHead>
                  <TableHead className="text-slate-600">Used</TableHead>
                  <TableHead className="text-slate-600">Quota</TableHead>
                  <TableHead className="text-slate-600">Remaining</TableHead>
                  <TableHead className="text-slate-600">Last Active</TableHead>
                  <TableHead className="text-slate-600">Human Requests</TableHead>
                  <TableHead className="text-slate-600">Tour Requests</TableHead>
                  <TableHead className="text-slate-600">Actions</TableHead>
                  <TableHead className="text-slate-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length ? (
                  clients.map((client) => {
                    const rem = client.quota - client.used;
                    return (
                      <TableRow key={client._id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.used.toLocaleString()}</TableCell>
                        <TableCell>{client.quota.toLocaleString()}</TableCell>
                        <TableCell>{rem.toLocaleString()}</TableCell>
                        <TableCell>{client.lastActive ? new Date(client.lastActive).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{client.humanRequests?.toLocaleString() || 0}</TableCell>
                        <TableCell>{client.tourRequests?.toLocaleString() || 0}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingClient(client);
                              setForm({
                                name: client.name || "",
                                email: client.email || "",
                                quota: client.quota || 1000,
                                clientId: client.clientId || "",
                                pageId: client.pageId || 0,
                                systemPrompt: client.systemPrompt || "",
                                faqs: client.faqs || "",
                                used: client.used || 0,
                                remaining: client.remaining ?? client.quota,
                                lastActive: client.lastActive || "",
                                PAGE_ACCESS_TOKEN: client.PAGE_ACCESS_TOKEN || "",
                                VERIFY_TOKEN: client.VERIFY_TOKEN || "",
                                igId: client.igId || "",
                              });
                              setExistingFiles(client.files || []);
                              setFiles([]);
                              // reset bot build state for this client
                              setShowBuildSection(false);
                              setBuildError("");
                              setBuildSuccess("");
                              setBotForm((prev) => ({ ...prev, businessName: client.name || "" }));
                              // fetch knowledge status for this client
                              fetchKnowledgeGate(client.clientId);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteClient(client.clientId)}>
                            Delete
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => renewClient(client.clientId)}>
                            Renew Month
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => viewClientConvos(client.clientId)}>
                            View Convos
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={client.active ? "secondary" : "outline"}
                            onClick={async () => {
                              try {
                                await fetch(`${API}/api/clients/${client.clientId}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ ...client, active: !client.active }),
                                });
                                await fetchStats();
                              } catch (err) {
                                console.error("Error updating client status:", err);
                              }
                            }}
                          >
                            {client.active ? "Deactivate" : "Activate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-500 py-6">No clients found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* ── Add/Edit Client Dialog ─────────────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-full sm:max-w-[820px] mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              {editingClient ? "Edit Client" : "Add Client"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Basic info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input
                  type="number"
                  placeholder="Quota"
                  value={form.quota}
                  onChange={(e) => setForm({ ...form, quota: Number(e.target.value) })}
                />
                <Input placeholder="Client ID" value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value })} />
                <Input
                  placeholder="Page ID"
                  value={form.pageId || ""}
                  onChange={(e) => setForm({ ...form, pageId: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-3">
                <Input placeholder="Instagram ID" value={form.igId || ""} onChange={(e) => setForm({ ...form, igId: e.target.value })} />
                <Input
                  placeholder="Page Access Token"
                  value={form.PAGE_ACCESS_TOKEN || ""}
                  onChange={(e) => setForm({ ...form, PAGE_ACCESS_TOKEN: e.target.value })}
                />
                <Input
                  placeholder="Verify Token"
                  value={form.VERIFY_TOKEN || ""}
                  onChange={(e) => setForm({ ...form, VERIFY_TOKEN: e.target.value })}
                />
                <textarea
                  placeholder="System Prompt"
                  value={form.systemPrompt || ""}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  className="w-full border rounded p-2 min-h-[120px] sm:min-h-[150px] focus:outline-none focus:ring-2 focus:ring-sky-200 resize-vertical"
                />
              </div>
            </div>

            {/* FAQs */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">FAQs (comma separated)</label>
              <textarea
                placeholder="faqs..."
                className="w-full border rounded p-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-sky-200"
                value={form.faqs || ""}
                onChange={(e) => setForm({ ...form, faqs: e.target.value })}
              />
            </div>

            {/* Existing files */}
            {existingFiles.length > 0 && (
              <div className="space-y-2">
                <label className="font-medium text-sm text-slate-700">Existing Files</label>
                {existingFiles.map((f) => (
                  <div key={f._id} className="flex gap-2 items-center bg-slate-50 p-2 rounded">
                    <span className="flex-1 truncate text-sm">{f.name}</span>
                    <Button size="sm" variant="destructive" onClick={() => deleteFile(f._id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* New file uploads */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Upload Files</label>
                <Button type="button" size="sm" onClick={addFile}>+ Add File</Button>
              </div>
              {files.map((f, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <Input
                    type="file"
                    onChange={(e) => updateFile(i, "file", e.target.files[0])}
                    className="cursor-pointer border p-2 rounded bg-slate-50 w-full sm:w-auto"
                  />
                  <Input
                    placeholder="Query Name"
                    value={f.name}
                    onChange={(e) => updateFile(i, "name", e.target.value)}
                    className="w-full sm:w-auto"
                  />
                </div>
              ))}
            </div>

            {/* Read-only info */}
            {editingClient && (
              <div className="text-sm text-gray-500 space-y-1 border-t pt-3">
                <p><strong>Used:</strong> {form.used}</p>
                <p><strong>Remaining:</strong> {form.remaining}</p>
                <p><strong>Last Active:</strong> {form.lastActive ? new Date(form.lastActive).toLocaleString() : "N/A"}</p>
                <p><strong>Human Requests:</strong> {editingClient.humanRequests || 0}</p>
                <p><strong>Tour Requests:</strong> {editingClient.tourRequests || 0}</p>
              </div>
            )}

            {/* ── Bot Build / Rebuild section (only for existing clients) ── */}
            {editingClient?.clientId && (
              <div className="border-t pt-4 space-y-3">
                {/* Section header + toggle */}
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setShowBuildSection((v) => !v)}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-800">
                      {botReady ? "Edit / Rebuild Bot" : "Build Bot"}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded border ${buildBadgeClass()}`}>
                      {buildBadge()} • v{Number(knowledgeVersion || 0)}
                    </span>
                  </div>
                  <span className="text-slate-400 text-sm">{showBuildSection ? "▲ collapse" : "▼ expand"}</span>
                </div>

                {showBuildSection && (
                  <div className="space-y-4 bg-slate-50 rounded-xl p-4 border">
                    <p className="text-sm text-slate-600">
                      Add or update business data to power this client's chatbot. After building, connections are unlocked.
                    </p>

                    {/* Bot status banner */}
                    {!botReady ? (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                        🔒 Bot not built yet for this client.
                      </div>
                    ) : (
                      <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                        ✅ Bot is built. You can rebuild to update knowledge.
                      </div>
                    )}

                    {/* Replace toggle */}
                    <div className="flex items-center justify-between border rounded-lg p-3 bg-white">
                      <div>
                        <div className="text-sm font-medium text-slate-800">Replace old knowledge</div>
                        <div className="text-xs text-slate-500">
                          If ON, wipes old saved files + chunks first to prevent mixed data.
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={replaceOldKnowledge}
                          onChange={(e) => setReplaceOldKnowledge(e.target.checked)}
                        />
                        ON
                      </label>
                    </div>

                    {/* Coverage info (if already built) */}
                    {botReady && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="border rounded-lg bg-white p-3">
                          <div className="text-xs text-slate-500">Sections detected</div>
                          <div className="text-sm font-medium text-slate-800 mt-1">
                            {sectionsPresent?.length ? sectionsPresent.join(", ") : "—"}
                          </div>
                        </div>
                        <div className="border rounded-lg bg-white p-3">
                          <div className="text-xs text-slate-500">Coverage</div>
                          {coverageWarnings?.length ? (
                            <div className="mt-2 space-y-1">
                              {coverageWarnings.slice(0, 4).map((w, i) => (
                                <div key={i} className="text-xs text-orange-700">⚠️ {w}</div>
                              ))}
                              {coverageWarnings.length > 4 && (
                                <div className="text-xs text-slate-500">+{coverageWarnings.length - 4} more…</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-green-700 mt-1">✅ Looks good</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Prompt settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-xl p-4 bg-white">
                      <div className="space-y-2">
                        <label className="text-xs text-slate-600">Business type template</label>
                        <select
                          value={promptSettings.businessType}
                          onChange={(e) => setPromptSettings((p) => ({ ...p, businessType: e.target.value }))}
                          className="border rounded p-2 text-sm w-full bg-slate-50"
                        >
                          {BUSINESS_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-slate-600">Tone</label>
                        <select
                          value={promptSettings.tone}
                          onChange={(e) => setPromptSettings((p) => ({ ...p, tone: e.target.value }))}
                          className="border rounded p-2 text-sm w-full bg-slate-50"
                        >
                          <option value="friendly">Friendly</option>
                          <option value="professional">Professional</option>
                          <option value="sales">Sales-focused</option>
                          <option value="concise">Concise</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={promptSettings.orderFlowEnabled}
                          onChange={(e) => setPromptSettings((p) => ({ ...p, orderFlowEnabled: e.target.checked }))}
                        />
                        Enable order flow token
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={promptSettings.humanEscalationEnabled}
                          onChange={(e) => setPromptSettings((p) => ({ ...p, humanEscalationEnabled: e.target.checked }))}
                        />
                        Enable human escalation token
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={promptSettings.tourFlowEnabled}
                          onChange={(e) => setPromptSettings((p) => ({ ...p, tourFlowEnabled: e.target.checked }))}
                        />
                        Enable booking flow token
                      </label>
                    </div>

                    {/* Build mode tabs */}
                    <div className="flex gap-2 flex-wrap">
                      <Button variant={buildMode === "form" ? "default" : "outline"} onClick={() => setBuildMode("form")}>
                        Quick Form
                      </Button>
                      <Button variant={buildMode === "paste" ? "default" : "outline"} onClick={() => setBuildMode("paste")}>
                        Paste Text
                      </Button>
                      <Button variant={buildMode === "upload" ? "default" : "outline"} onClick={() => setBuildMode("upload")}>
                        Upload .txt
                      </Button>
                    </div>

                    {/* Section selector (paste / upload) */}
                    {buildMode !== "form" && (
                      <div className="space-y-2">
                        <label className="text-xs text-slate-600">Content type</label>
                        <select
                          value={rawSection}
                          onChange={(e) => setRawSection(e.target.value)}
                          className="border rounded-lg px-3 py-2 text-sm w-full"
                        >
                          {RAW_SECTION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Form mode */}
                    {buildMode === "form" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={botForm.businessName} onChange={(e) => setBotForm((p) => ({ ...p, businessName: e.target.value }))} placeholder="Business name" className="border rounded p-2 text-sm w-full" />
                        <input value={botForm.businessType} onChange={(e) => setBotForm((p) => ({ ...p, businessType: e.target.value }))} placeholder="Business type text (optional)" className="border rounded p-2 text-sm w-full" />
                        <input value={botForm.cityArea} onChange={(e) => setBotForm((p) => ({ ...p, cityArea: e.target.value }))} placeholder="City / areas served" className="border rounded p-2 text-sm w-full" />
                        <input value={botForm.phoneWhatsapp} onChange={(e) => setBotForm((p) => ({ ...p, phoneWhatsapp: e.target.value }))} placeholder="Phone / WhatsApp" className="border rounded p-2 text-sm w-full" />
                        <input value={botForm.email} onChange={(e) => setBotForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="border rounded p-2 text-sm w-full" />
                        <input value={botForm.address} onChange={(e) => setBotForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address / location" className="border rounded p-2 text-sm w-full" />
                        <input value={botForm.hours} onChange={(e) => setBotForm((p) => ({ ...p, hours: e.target.value }))} placeholder="Working hours" className="border rounded p-2 text-sm w-full md:col-span-2" />
                        <textarea value={botForm.about} onChange={(e) => setBotForm((p) => ({ ...p, about: e.target.value }))} placeholder="About the business" className="border rounded p-2 text-sm w-full min-h-[80px] md:col-span-2" />
                        <textarea value={botForm.services} onChange={(e) => setBotForm((p) => ({ ...p, services: e.target.value }))} placeholder="Services" className="border rounded p-2 text-sm w-full min-h-[80px] md:col-span-2" />
                        <textarea value={botForm.pricing} onChange={(e) => setBotForm((p) => ({ ...p, pricing: e.target.value }))} placeholder="Pricing / packages" className="border rounded p-2 text-sm w-full min-h-[80px] md:col-span-2" />
                        <textarea value={botForm.menu} onChange={(e) => setBotForm((p) => ({ ...p, menu: e.target.value }))} placeholder="Menu" className="border rounded p-2 text-sm w-full min-h-[100px] md:col-span-2" />
                        <textarea value={botForm.products} onChange={(e) => setBotForm((p) => ({ ...p, products: e.target.value }))} placeholder="Products / catalog" className="border rounded p-2 text-sm w-full min-h-[100px] md:col-span-2" />
                        <textarea value={botForm.listingsSummary} onChange={(e) => setBotForm((p) => ({ ...p, listingsSummary: e.target.value }))} placeholder="Items / listings / properties summary" className="border rounded p-2 text-sm w-full min-h-[100px] md:col-span-2" />
                        <textarea value={botForm.paymentPlans} onChange={(e) => setBotForm((p) => ({ ...p, paymentPlans: e.target.value }))} placeholder="Payment / pricing / installment plans" className="border rounded p-2 text-sm w-full min-h-[100px] md:col-span-2" />
                        <textarea value={botForm.booking} onChange={(e) => setBotForm((p) => ({ ...p, booking: e.target.value }))} placeholder="Bookings / appointments / reservations" className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2" />
                        <textarea value={botForm.team} onChange={(e) => setBotForm((p) => ({ ...p, team: e.target.value }))} placeholder="Team / doctors / staff" className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2" />
                        <textarea value={botForm.courses} onChange={(e) => setBotForm((p) => ({ ...p, courses: e.target.value }))} placeholder="Courses / programs" className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2" />
                        <textarea value={botForm.rooms} onChange={(e) => setBotForm((p) => ({ ...p, rooms: e.target.value }))} placeholder="Rooms / accommodation" className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2" />
                        <textarea value={botForm.delivery} onChange={(e) => setBotForm((p) => ({ ...p, delivery: e.target.value }))} placeholder="Delivery / shipping" className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2" />
                        <textarea value={botForm.policies} onChange={(e) => setBotForm((p) => ({ ...p, policies: e.target.value }))} placeholder="Policies" className="border rounded p-2 text-sm w-full min-h-[80px] md:col-span-2" />
                        <textarea value={botForm.faqs} onChange={(e) => setBotForm((p) => ({ ...p, faqs: e.target.value }))} placeholder="FAQs" className="border rounded p-2 text-sm w-full min-h-[120px] md:col-span-2" />
                      </div>
                    )}

                    {/* Paste mode */}
                    {buildMode === "paste" && (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500">
                          Best format: headings like <b>## FAQs</b>, <b>## Menu</b>, <b>## Products</b> and use <b>---</b> between items.
                        </div>
                        <textarea
                          value={rawText}
                          onChange={(e) => setRawText(e.target.value)}
                          placeholder="Paste your data here..."
                          className="border rounded p-2 text-sm w-full min-h-[220px]"
                        />
                      </div>
                    )}

                    {/* Upload mode */}
                    {buildMode === "upload" && (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500">Upload a .txt file.</div>
                        <input
                          type="file"
                          accept=".txt,text/plain"
                          onChange={(e) => setRawFile(e.target.files?.[0] || null)}
                          className="text-sm"
                        />
                        {rawFile && <div className="text-xs text-slate-600">Selected: {rawFile.name}</div>}
                      </div>
                    )}

                    {/* Errors / success */}
                    {buildError && (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 whitespace-pre-wrap">{buildError}</div>
                    )}
                    {buildSuccess && (
                      <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{buildSuccess}</div>
                    )}

                    {/* Build action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={submitBuild} disabled={buildLoading}>
                        {buildLoading ? "Building..." : botReady ? "Rebuild Bot" : "Build Bot"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fetchKnowledgeGate(editingClient.clientId, effectiveBotType)}
                        disabled={buildLoading}
                      >
                        Refresh Bot Status
                      </Button>
                    </div>

                    <div className="text-xs text-slate-500">
                      Tip: Quick Form for basics. Paste Text / Upload for long data. Use headings like <b>## FAQs</b>, <b>## Menu</b>, or separators <b>---</b> between items.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-2 pb-4 pt-2">
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={saveClient} className="w-full md:w-auto">
              {editingClient ? "Update Client" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Conversations Dialog ───────────────────────────────────────────── */}
      <Dialog open={showConvoModal} onOpenChange={setShowConvoModal}>
        <DialogContent className="w-full sm:max-w-3xl mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">Client Conversations</DialogTitle>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-3 mb-2">
              {["all", "web", "messenger", "instagram", "whatsapp"].map((src) => (
                <Button
                  key={src}
                  variant={selectedSource === src ? "default" : "outline"}
                  onClick={() => setSelectedSource(src)}
                  className="capitalize flex-1 sm:flex-none"
                >
                  {src}
                </Button>
              ))}
            </div>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto px-1 pb-4">
            {currentConvos.length ? (
              currentConvos.map((c, idx) => (
                <div key={idx} className="border rounded-lg p-3 bg-white shadow-sm">
                  <p className="text-red-500 font-semibold mb-1">Conversation #{idx + 1}</p>
                  <p className="font-medium">{c.user || c.userId || c.psid || "Unknown user"}</p>
                  <div className="pl-2 space-y-2 mt-2">
                    {c.history?.map((msg, i) => (
                      <p key={i} className="text-sm">
                        <strong className={msg.role === "user" ? "text-slate-800" : "text-sky-600"}>
                          {msg.role === "user" ? "User" : "Assistant"}:
                        </strong>{" "}
                        {msg.content}
                      </p>
                    )) || <p className="text-sm text-gray-400">No messages</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No conversations found.</p>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => exportConvos(currentConvos, "json")}>Export JSON</Button>
            <Button variant="outline" onClick={() => exportConvos(currentConvos, "csv")}>Export CSV</Button>
            <Button onClick={() => setShowConvoModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
