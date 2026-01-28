// src/pages/ClientDashboard.jsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MessageSquare, Gauge, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function ClientDashboard() {
  const [stats, setStats] = useState({
    used: 0,
    quota: 1000,
    weeklyData: [],
  });
  const [mode, setMode] = useState("weekly");
  const [chartData, setChartData] = useState([]);
  const [selectedSource, setSelectedSource] = useState("all");
  const [conversationStats, setConversationStats] = useState({
    totalConversations: 0,
    avgMessages: 0,
    activeToday: 0,
  });
  const [showConvoModal, setShowConvoModal] = useState(false);
  const [currentConvos, setCurrentConvos] = useState([]);
  const [humanRequests, setHumanRequests] = useState(0);
  const [tourRequests, setTourRequests] = useState(0);

  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);

  // 🔹 Agent Handover State
  const [handoverEnabled, setHandoverEnabled] = useState(false);

  // ✅ Page Connection State (reads PAGE_NAME from Mongo)
  const [pageName, setPageName] = useState("");
  const [pageId, setPageId] = useState("");

  // 🔹 Get user info from /api/me
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("https://serverowned.onrender.com/api/me", {
          credentials: "include",
        });
        const data = await res.json();
        console.log("/api/me response:", data);

        if (!res.ok || data.role !== "client") {
          navigate("/"); // redirect if not client
          return;
        }

        console.log("ClientID from /api/me:", data.clientId);
        setClientId(data.clientId);
      } catch (err) {
        console.error("Could not verify user:", err);
        navigate("/");
      }
    }
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Fetch stats & handover status when clientId changes
  useEffect(() => {
    if (!clientId) return;
    fetchStats();
    fetchConversationStats();
    fetchHandoverStatus();
    fetchClientPageConnection(); // ✅ NEW
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ✅ NEW: Fetch client object to show PAGE_NAME if connected
  const fetchClientPageConnection = async () => {
    try {
      const res = await fetch(`https://serverowned.onrender.com/api/clients/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json();
      setPageName(data?.PAGE_NAME || ""); // ✅ Mongo field
      setPageId(data?.pageId || ""); // 
    } catch (err) {
      console.error("Error fetching client page connection:", err);
    }
  };

  // 🔹 Fetch chart data when mode changes
  useEffect(() => {
    if (!clientId) return;

    const fetchChartData = async () => {
      try {
        const res = await fetch(
          `https://serverowned.onrender.com/api/stats/${clientId}?mode=${mode}`,
          { credentials: "include" }
        );
        const data = await res.json();
        console.log(`📊 /api/stats/${clientId}?mode=${mode}`, data);

        const results = Array.isArray(data) ? data : data.chartResults || [];
        console.log("📊 Normalized results array:", results);

        let normalized = [];

        if (mode === "daily") {
          normalized = results.map((d) => ({
            label: `${d._id}:00`,
            messages: d.count,
          }));
        } else if (mode === "weekly") {
          const daysMap = {
            1: "Sun",
            2: "Mon",
            3: "Tue",
            4: "Wed",
            5: "Thu",
            6: "Fri",
            7: "Sat",
          };
          normalized = results.map((d) => ({
            label: daysMap[d._id] || d._id,
            messages: d.count,
          }));
        } else if (mode === "monthly") {
          normalized = results.map((d) => ({
            label: d._id.toString(),
            messages: d.count,
          }));
        }

        console.log("📊 Normalized chartData:", normalized);
        setChartData(normalized);
      } catch (err) {
        console.error("Error fetching chart data:", err);
      }
    };

    fetchChartData();
  }, [mode, clientId]);

  // 🔹 Fetch handover status from backend
  const fetchHandoverStatus = async () => {
    try {
      const res = await fetch(`https://serverowned.onrender.com/api/clients/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json();
      setHandoverEnabled(Boolean(data.active));
    } catch (err) {
      console.error("Error fetching handover status:", err);
    }
  };

  // 🔹 Toggle handover
  const handleHandoverToggle = async () => {
    try {
      if (!clientId) return;

      // Fetch current client object first
      const res = await fetch(`https://serverowned.onrender.com/api/clients/${clientId}`, {
        credentials: "include",
      });
      const client = await res.json();

      // Toggle active
      const newActive = !client.active;

      // Send full client object with updated active
      await fetch(`https://serverowned.onrender.com/api/clients/${client.clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...client, active: newActive }),
      });

      // Refresh local handover status and stats
      await fetchHandoverStatus();
      await fetchStats();
    } catch (err) {
      console.error("Error updating handover status:", err);
    }
  };

  async function fetchStats() {
    try {
      const res = await fetch(`https://serverowned.onrender.com/api/stats/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json();
      console.log("Stats data:", data);
      setStats(data);

      // Set human/tour requests
      setHumanRequests(data.totalHumanRequests || 0);
      setTourRequests(data.totalTourRequests || 0);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  const handleLogout = async () => {
    try {
      const res = await fetch("https://serverowned.onrender.com/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        navigate("/");
      } else {
        console.error("Logout failed");
      }
    } catch (err) {
      console.error("Error logging out:", err);
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
          rows.push([idx, msg.role, msg.content.replace(/,/g, " ")]);
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

  async function fetchConversationStats() {
    try {
      const res = await fetch(`https://serverowned.onrender.com/api/conversations/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json();
      console.log("Conversations raw data:", data);

      if (Array.isArray(data)) {
        const total = data.length;
        const avg =
          total > 0 ? Math.round(data.reduce((sum, c) => sum + (c.history?.length || 0), 0) / total) : 0;

        const today = data.filter((c) => {
          const updated = new Date(c.updatedAt);
          const now = new Date();
          return (
            updated.getDate() === now.getDate() &&
            updated.getMonth() === now.getMonth() &&
            updated.getFullYear() === now.getFullYear()
          );
        }).length;

        const bySource = {
          web: data.filter((c) => c.source === "web").length,
          messenger: data.filter((c) => c.source === "messenger").length,
          instagram: data.filter((c) => c.source === "instagram").length,
        };

        setConversationStats({
          totalConversations: total,
          avgMessages: avg,
          activeToday: today,
          bySource,
        });

        console.log("Computed conversationStats:", {
          total,
          avg,
          today,
          bySource,
        });
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  }

  const viewConvos = async () => {
    try {
      const query = selectedSource === "all" ? "" : `?source=${selectedSource}`;
      const res = await fetch(`https://serverowned.onrender.com/api/conversations/${clientId}${query}`, {
        credentials: "include",
      });
      const data = await res.json();
      setCurrentConvos(data || []);
      setShowConvoModal(true);
    } catch (err) {
      console.error("Error fetching client conversations:", err);
    }
  };

  useEffect(() => {
    if (showConvoModal) {
      viewConvos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource, showConvoModal]);

  const { used, quota } = stats;
  const remaining = quota - used;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Client Dashboard</h1>
            <p className="text-slate-500 mt-1">Your personal usage and conversations.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-slate-500">Logged in as</div>
              <div className="font-medium text-slate-800 text-sm">{localStorage.getItem("userEmail") || "Client"}</div>
            </div>

            <Button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        {/* Connect Facebook Page */}
        <Card className="p-4 border-l-4 border-blue-600">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Facebook Page Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Connect your Facebook Page to enable Messenger chatbot features and manage messages directly.
            </p>

            {/* ✅ Shows PAGE_NAME if exists */}
            {pageName ? (
              <p className="text-sm text-slate-600">
                Connected Page: <span className="font-medium">{pageName}</span>
              </p>
            ) : null}
             {pageId ? (
              <p className="text-sm text-slate-600">
                Connected PageId: <span className="font-medium">{pageId}</span>
              </p>
            ) : null}
<Button
  onClick={() => {
    window.location.href =
      `https://serverowned.onrender.com/auth/facebook?clientId=${encodeURIComponent(clientId)}`;
  }}
  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg"
>
  Connect Facebook Page
</Button>


          </CardContent>
        </Card>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <MessageSquare size={18} className="text-sky-500" />
                <div className="text-sm">Messages Used</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-slate-900">{used?.toLocaleString()}</div>
              <p className="text-slate-500 text-sm mt-1">Out of {quota?.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <Gauge size={18} className="text-sky-500" />
                <div className="text-sm">Remaining Quota</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-slate-900">{(remaining ?? 0).toLocaleString()}</div>
              <p className="text-slate-500 text-sm mt-1">{(((remaining ?? 0) / (quota || 1)) * 100).toFixed(0)}% left</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <MessageSquare size={18} className="text-sky-500" />
                <div className="text-sm">Conversations</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-slate-900">{conversationStats.totalConversations}</div>
              <p className="text-slate-500 text-sm mt-1">
                Avg {conversationStats.avgMessages} msgs • {conversationStats.activeToday} active today
              </p>

              <div className="space-y-1 text-sm mt-3">
                <p>
                  <span className="font-medium">Web:</span> {conversationStats.bySource?.web ?? 0}
                </p>
                <p>
                  <span className="font-medium">Messenger:</span> {conversationStats.bySource?.messenger ?? 0}
                </p>
                <p>
                  <span className="font-medium">Instagram:</span> {conversationStats.bySource?.instagram ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <Users size={18} className="text-green-500" />
                <div className="text-sm">Human Requests</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-slate-900">{humanRequests}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <Users size={18} className="text-orange-500" />
                <div className="text-sm">Orders</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-slate-900">{tourRequests}</div>
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

            <div className="flex items-center gap-3">
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

        {/* Conversations Section */}
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            {/* Left side */}
            <div className="flex items-center gap-3">
              <Users size={18} className="text-sky-500" />
              <h2 className="text-xl font-semibold text-slate-900">Your Conversations</h2>
            </div>

            {/* Right side */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 w-full sm:w-auto"
              >
                <option value="all">All</option>
                <option value="web">Web</option>
                <option value="messenger">Messenger</option>
                <option value="instagram">Instagram</option>
              </select>

              <Button className="w-full sm:w-auto" onClick={() => viewConvos(clientId)}>
                View All
              </Button>
            </div>
          </div>

          {/* quick preview area (keeps original functionality — listing handled in modal) */}
          <div className="text-sm text-slate-500">
            Click "View All" to open the conversations modal with full list and export options.
          </div>
        </Card>

        {/* Agent Handover */}
        <Card className="p-4 border-l-4 border-blue-500">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Agent Handover</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Toggle active status to allow agents to take over your conversations.
            </p>

            <div className="flex gap-3 items-center">
              <Button
                variant={handoverEnabled ? "secondary" : "outline"}
                onClick={async () => {
                  try {
                    if (!clientId) return;

                    // 1️⃣ Fetch full client object from backend
                    const res = await fetch(`https://serverowned.onrender.com/api/clients/${clientId}`, {
                      credentials: "include",
                    });
                    const client = await res.json();

                    // 2️⃣ Toggle active
                    const newActive = !client.active;

                    await fetch(`https://serverowned.onrender.com/api/clients/${client.clientId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ ...client, active: newActive }),
                    });

                    // 3️⃣ Refresh state from backend
                    await fetchHandoverStatus();
                    await fetchStats();
                  } catch (err) {
                    console.error("Error updating handover status:", err);
                  }
                }}
              >
                {handoverEnabled ? "Deactivate" : "Activate"}
              </Button>

              <div className="text-sm text-slate-600">
                {handoverEnabled ? "Agents can take over conversations" : "Agents cannot take over conversations"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations Modal */}
      <Dialog open={showConvoModal} onOpenChange={setShowConvoModal}>
        <DialogContent
          className="
      max-w-3xl 
      max-h-[90vh]       /* prevents it from going off screen */
      overflow-y-auto    /* scroll inside modal */
      top-1/2 left-1/2   /* center */
      translate-x-[-50%] translate-y-[-50%]
    "
        >
          <DialogHeader>
            <DialogTitle>Client Conversations</DialogTitle>

            <div className="flex gap-2 mt-3 mb-2">
              <Button variant={selectedSource === "all" ? "default" : "outline"} onClick={() => setSelectedSource("all")}>
                All
              </Button>
              <Button variant={selectedSource === "web" ? "default" : "outline"} onClick={() => setSelectedSource("web")}>
                Web
              </Button>
              <Button
                variant={selectedSource === "messenger" ? "default" : "outline"}
                onClick={() => setSelectedSource("messenger")}
              >
                Messenger
              </Button>
              <Button
                variant={selectedSource === "instagram" ? "default" : "outline"}
                onClick={() => setSelectedSource("instagram")}
              >
                Instagram
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1 pb-4">
            {currentConvos.length ? (
              currentConvos.map((c, idx) => (
                <div key={idx} className="border rounded-lg p-3 bg-white shadow-sm">
                  <p className="text-red-500 font-semibold mb-1">Conversation #{idx + 1}</p>

                  <p className="font-medium">{c.user}</p>
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

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => exportConvos(currentConvos, "json")}>
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => exportConvos(currentConvos, "csv")}>
              Export CSV
            </Button>
            <Button onClick={() => setShowConvoModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
