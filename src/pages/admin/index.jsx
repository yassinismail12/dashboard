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
  const [files, setFiles] = useState([]); // new uploads
  const [existingFiles, setExistingFiles] = useState([]); // files already uploaded

  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStats();
    fetchConversationStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showConvoModal && editingClient?.clientId) {
      viewClientConvos(editingClient.clientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource, showConvoModal]);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await fetch(`${API}/api/stats?mode=${mode}`, {
          credentials: "include",
        });
        const data = await res.json();
        const results = data.chartResults || [];

        let normalized = [];
        if (mode === "daily") {
          normalized = results.map((d) => ({
            label: `${d._id}:00`,
            messages: d.count,
          }));
        } else if (mode === "weekly") {
          const daysMap = { 1: "Sun", 2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat" };
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

        setChartData(normalized);
      } catch (err) {
        console.error("❌ Error fetching chart data:", err);
      }
    };

    fetchChartData();
  }, [mode]);

  async function fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, {
          ...options,
          credentials: "include",
        });
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return await res.json();
      } catch (err) {
        console.warn(`Retry ${i + 1}/${retries} failed:`, err.message);
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
  }

  async function fetchStats() {
    try {
      const data = await fetchWithRetry(`${API}/api/stats`);
      setStats(data);
    } catch (err) {
      console.error("❌ Stats failed after retries:", err);
    }
  }

  async function fetchConversationStats() {
    try {
      const data = await fetchWithRetry(`${API}/api/conversations`);

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

        setConversationStats({
          totalConversations: total,
          avgMessages: avg,
          activeToday: today,
        });
      }
    } catch (err) {
      console.error("❌ Conversations failed after retries:", err);
    }
  }

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

      const res = await fetch(`${API}/api/conversations/${clientId}${query}`, {
        credentials: "include",
      });

      const data = await res.json();
      setCurrentConvos(data || []);
      setShowConvoModal(true);
    } catch (err) {
      console.error("❌ Error fetching client conversations:", err);
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
  };

  // ✅ FIXED: delete file endpoint must be:
  // DELETE /clients/:clientId/files/:fileId
  const deleteFile = async (fileId) => {
    try {
      const clientId = editingClient?.clientId || form.clientId;
      if (!clientId) {
        console.error("❌ Cannot delete file: missing clientId (open a client in edit first).");
        return;
      }

      const res = await fetch(`${API}/clients/${clientId}/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("❌ Error deleting file:", data);
        return;
      }

      setExistingFiles((prev) => prev.filter((f) => f._id !== fileId));

      // optional: refresh stats so table has fresh file list
      await fetchStats();
    } catch (err) {
      console.error("❌ Error deleting file:", err);
    }
  };

  const saveClient = async () => {
    try {
      const clientPayload = {
        ...form,
      };

      const url =
        editingClient && editingClient.clientId
          ? `${API}/api/clients/${editingClient.clientId}`
          : `${API}/api/clients`;

      const method = editingClient && editingClient.clientId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientPayload),
        credentials: "include",
      });

      const resJson = await res.json();
      if (!res.ok) {
        console.error("❌ Save failed:", resJson);
        return;
      }

      const savedClient = resJson.client ? resJson.client : resJson;
      const savedClientId = savedClient.clientId;

      // Upload files to /upload/:clientId
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
          console.error("❌ File upload failed:", upErr);
        }
      }

      await fetchStats();
      resetForm();
    } catch (err) {
      console.error("❌ Error saving client:", err);
    }
  };

  const deleteClient = async (clientId) => {
    try {
      const res = await fetch(`${API}/api/clients/${clientId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("❌ Delete failed:", err);
        return;
      }

      await fetchStats();

      if (editingClient && editingClient.clientId === clientId) {
        resetForm();
      }
    } catch (err) {
      console.error("❌ Error deleting client:", err);
    }
  };

  async function renewClient(clientId) {
    try {
      await fetch(`${API}/admin/renew/${clientId}`, {
        method: "POST",
        credentials: "include",
      });
      await fetchStats();
    } catch (err) {
      console.error("Failed to renew client", err);
    }
  }

  async function renewAllClients() {
    try {
      await fetch(`${API}/admin/renew-all`, {
        method: "POST",
        credentials: "include",
      });
      await fetchStats();
    } catch (err) {
      console.error("Failed to renew all clients", err);
    }
  }

  const handleLogout = async () => {
    try {
      const res = await fetch(`${API}/api/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        navigate("/");
      } else {
        console.error("❌ Logout failed");
      }
    } catch (err) {
      console.error("❌ Error logging out:", err);
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
              <div className="text-sm text-slate-500">Logged in as</div>
              <div className="font-medium text-slate-800 text-sm">
                {localStorage.getItem("userEmail") || "Admin"}
              </div>
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
            <CardHeader className="flex justify-between items-start">
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
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
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
                    const remaining = client.quota - client.used;

                    return (
                      <TableRow key={client._id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.used.toLocaleString()}</TableCell>
                        <TableCell>{client.quota.toLocaleString()}</TableCell>
                        <TableCell>{remaining.toLocaleString()}</TableCell>
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
                                const newActive = !client.active;

                                await fetch(`${API}/api/clients/${client.clientId}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ ...client, active: newActive }),
                                });

                                await fetchStats();
                              } catch (err) {
                                console.error("❌ Error updating client status:", err);
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
                    <TableCell colSpan={10} className="text-center text-slate-500 py-6">
                      No clients found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Add/Edit Client Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-full sm:max-w-[720px] mx-auto max-h-[90vh] sm:max-h-[720px] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">{editingClient ? "Edit Client" : "Add Client"}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Column */}
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

              {/* Right Column */}
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
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">FAQs (comma separated)</label>
              <textarea
                placeholder="faqs..."
                className="w-full border rounded p-2 min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-sky-200"
                value={form.faqs || ""}
                onChange={(e) => setForm({ ...form, faqs: e.target.value })}
              />
            </div>

            {/* Existing files */}
            {existingFiles.length > 0 && (
              <div className="mt-4 space-y-2">
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
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Upload Files</label>
                <Button type="button" size="sm" onClick={addFile}>
                  + Add File
                </Button>
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
              <div className="mt-6 text-sm text-gray-500 space-y-1 border-t pt-3">
                <p>
                  <strong>Used:</strong> {form.used}
                </p>
                <p>
                  <strong>Remaining:</strong> {form.remaining}
                </p>
                <p>
                  <strong>Last Active:</strong> {form.lastActive ? new Date(form.lastActive).toLocaleString() : "N/A"}
                </p>
                <p>
                  <strong>Human Requests:</strong> {editingClient.humanRequests || 0}
                </p>
                <p>
                  <strong>Tour Requests:</strong> {editingClient.tourRequests || 0}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="px-2 pb-4">
            <Button onClick={saveClient} className="w-full md:w-auto">
              {editingClient ? "Update Client" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversations Dialog */}
      <Dialog open={showConvoModal} onOpenChange={setShowConvoModal}>
        <DialogContent className="w-full sm:max-w-3xl mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">Client Conversations</DialogTitle>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-3 mb-2">
              <Button variant={selectedSource === "all" ? "default" : "outline"} onClick={() => setSelectedSource("all")} className="capitalize flex-1 sm:flex-none">
                All
              </Button>
              <Button variant={selectedSource === "web" ? "default" : "outline"} onClick={() => setSelectedSource("web")} className="capitalize flex-1 sm:flex-none">
                Web
              </Button>
              <Button variant={selectedSource === "messenger" ? "default" : "outline"} onClick={() => setSelectedSource("messenger")} className="capitalize flex-1 sm:flex-none">
                Messenger
              </Button>
              <Button variant={selectedSource === "instagram" ? "default" : "outline"} onClick={() => setSelectedSource("instagram")} className="capitalize flex-1 sm:flex-none">
                Instagram
              </Button>
              <Button variant={selectedSource === "whatsapp" ? "default" : "outline"} onClick={() => setSelectedSource("whatsapp")} className="capitalize flex-1 sm:flex-none">
                Whatsapp
              </Button>
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
