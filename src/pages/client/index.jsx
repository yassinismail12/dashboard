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
  const [showMessagesOnly, setShowMessagesOnly] = useState(false);
  const [testPsid, setTestPsid] = useState("33461378173508614");

  const [selectedSource, setSelectedSource] = useState("all");
  const [conversationStats, setConversationStats] = useState({
    totalConversations: 0,
    avgMessages: 0,
    activeToday: 0,
    bySource: { web: 0, messenger: 0, instagram: 0, whatsapp: 0 },
  });
  const [ig, setIg] = useState({
  igId: "",
  igUsername: "",
  igName: "",
  igProfilePicUrl: "",
});

const [igProfile, setIgProfile] = useState(null);
const [igMedia, setIgMedia] = useState([]);
const [igLoadingProfile, setIgLoadingProfile] = useState(false);
const [igLoadingMedia, setIgLoadingMedia] = useState(false);
const [igError, setIgError] = useState("");


  const [showConvoModal, setShowConvoModal] = useState(false);
  const [currentConvos, setCurrentConvos] = useState([]);
  const [humanRequests, setHumanRequests] = useState(0);
  const [tourRequests, setTourRequests] = useState(0);
  const [payloadViewMode, setPayloadViewMode] = useState("full");

  const navigate = useNavigate();
  const [clientId, setClientId] = useState(null);

  const [handoverEnabled, setHandoverEnabled] = useState(false);

  const [pageName, setPageName] = useState("");
  const [pageId, setPageId] = useState("");

  const [webhookStatus, setWebhookStatus] = useState({
    webhookSubscribed: false,
    webhookFields: [],
    webhookSubscribedAt: null,
    lastWebhookAt: null,
    lastWebhookType: "",
  });

  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [lastWebhookPayload, setLastWebhookPayload] = useState(null);

  // ✅ NEW: health/warnings state
  const [health, setHealth] = useState({ status: "ok", warnings: [] });
  const [healthLoading, setHealthLoading] = useState(false);
const [postsLoading, setPostsLoading] = useState(false);
const [posts, setPosts] = useState([]);
const [postsError, setPostsError] = useState("");

const [selectedPostId, setSelectedPostId] = useState(null);
const [commentsLoading, setCommentsLoading] = useState(false);
const [comments, setComments] = useState([]);
const [commentsError, setCommentsError] = useState("");

  // 🔹 Get user info from /api/me
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("https://serverowned.onrender.com/api/me", {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok || data.role !== "client") {
          navigate("/");
          return;
        }

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
    fetchClientPageConnection();
    fetchWebhookStatus();
    fetchClientHealth(); // ✅ NEW
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ✅ NEW: Fetch warnings/health
  const fetchClientHealth = async () => {
    try {
      if (!clientId) return;
      setHealthLoading(true);

      const res = await fetch(`https://serverowned.onrender.com/api/clients/${clientId}/health`, {
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setHealth({
          status: data.status || "ok",
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
        });
      } else {
        setHealth({
          status: "warning",
          warnings: [{ code: "HEALTH_FETCH_FAILED", severity: "warn", message: data?.error || "Could not load warnings." }],
        });
      }
    } catch (err) {
      console.error("Error fetching client health:", err);
      setHealth({
        status: "warning",
        warnings: [{ code: "HEALTH_NETWORK", severity: "warn", message: "Could not load warnings (network/server error)." }],
      });
    } finally {
      setHealthLoading(false);
    }
  };

  // ✅ Fetch client object to show PAGE_NAME if connected
const fetchClientPageConnection = async () => {
  try {
    const res = await fetch(`https://serverowned.onrender.com/api/clients/${clientId}`, {
      credentials: "include",
    });
    const data = await res.json();

    setPageName(data?.PAGE_NAME || "");
    setPageId(data?.pageId || "");

    setIg({
      igId: data?.igId || "",
      igUsername: data?.igUsername || "",
      igName: data?.igName || "",
      igProfilePicUrl: data?.igProfilePicUrl || "",
    });
  } catch (err) {
    console.error("Error fetching client page connection:", err);
  }
};
const fetchIgProfile = async () => {
  try {
    setIgError("");
    setIgLoadingProfile(true);

    const res = await fetch(
      `https://serverowned.onrender.com/instagram/review/profile?clientId=${encodeURIComponent(clientId)}`,
      { credentials: "include" }
    );
    const json = await res.json();

    if (!res.ok || !json.ok) {
      setIgError(JSON.stringify(json.error || json));
      setIgProfile(null);
      return;
    }
    setIgProfile(json.data);
  } catch (e) {
    setIgError(e.message);
  } finally {
    setIgLoadingProfile(false);
  }
};

const fetchIgMedia = async () => {
  try {
    setIgError("");
    setIgLoadingMedia(true);

    const res = await fetch(
      `https://serverowned.onrender.com/instagram/review/media?clientId=${encodeURIComponent(clientId)}`,
      { credentials: "include" }
    );
    const json = await res.json();

    if (!res.ok || !json.ok) {
      setIgError(JSON.stringify(json.error || json));
      setIgMedia([]);
      return;
    }
    setIgMedia(json.data || []);
  } catch (e) {
    setIgError(e.message);
  } finally {
    setIgLoadingMedia(false);
  }
};


  // ✅ Fetch webhook status
  const fetchWebhookStatus = async () => {
    try {
      if (!clientId) return;
      const res = await fetch(`https://serverowned.onrender.com/api/webhooks/status/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setWebhookStatus({
          webhookSubscribed: Boolean(data?.webhookSubscribed),
          webhookFields: data?.webhookFields || [],
          webhookSubscribedAt: data?.webhookSubscribedAt || null,
          lastWebhookAt: data?.lastWebhookAt || null,
          lastWebhookType: data?.lastWebhookType || "",
        });
      }
    } catch (err) {
      console.error("Error fetching webhook status:", err);
    }
  };

  async function sendReviewTest(pageId, psid) {
    const r = await fetch("https://serverowned.onrender.com/api/review/send-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pageId, psid, text: "Your appointment has been scheduled." }),
    });

    const data = await r.json();
    if (data.ok) alert("Sent ✅");
    else alert("Failed ❌ (check server logs)");
  }

  // ✅ Enable webhooks
  const enableWebhooks = async () => {
    try {
      if (!clientId) return;
      setIsSubscribing(true);
      setSubscribeError("");

      const res = await fetch(`https://serverowned.onrender.com/api/webhooks/subscribe/${clientId}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        setSubscribeError(data?.error || "Subscription failed (no success=true returned)");
      }

      await fetchWebhookStatus();
      await fetchClientHealth(); // ✅ refresh warnings after action
    } catch (err) {
      console.error("Enable webhooks error:", err);
      setSubscribeError("Subscription failed (network/server error)");
    } finally {
      setIsSubscribing(false);
    }
  };
const loadRecentPosts = async () => {
  if (!pageId) return;
  try {
    setPostsError("");
    setPostsLoading(true);

    const res = await fetch(
  `https://serverowned.onrender.com/api/engagement/pages/${pageId}/posts?clientId=${encodeURIComponent(clientId)}`,
  { credentials: "include" }
);

    const json = await res.json();

    if (!res.ok || !json.ok) {
      setPostsError(JSON.stringify(json.error || json));
      setPosts([]);
      return;
    }

    setPosts(json.data || []);
  } catch (e) {
    setPostsError(e.message);
  } finally {
    setPostsLoading(false);
  }
};

const loadComments = async (postId) => {
  if (!pageId || !postId) return;
  try {
    setCommentsError("");
    setCommentsLoading(true);
    setSelectedPostId(postId);
const res = await fetch(
  `https://serverowned.onrender.com/api/engagement/posts/${postId}/comments?pageId=${encodeURIComponent(pageId)}&clientId=${encodeURIComponent(clientId)}`,
  { credentials: "include" }
);

    const json = await res.json();

    if (!res.ok || !json.ok) {
      setCommentsError(JSON.stringify(json.error || json));
      setComments([]);
      return;
    }

    setComments(json.data || []);
  } catch (e) {
    setCommentsError(e.message);
  } finally {
    setCommentsLoading(false);
  }
};

  const extractMessagesFromPayload = (payload) => {
    if (!payload) return null;

    const raw = payload?.lastWebhookPayload || payload;

    const waMessages = (raw?.entry || [])
      .flatMap((e) => e?.changes || [])
      .flatMap((c) => c?.value?.messages || [])
      .filter(Boolean);

    if (waMessages.length) return waMessages;

    const messagingEvents = (raw?.entry || [])
      .flatMap((e) => e?.messaging || [])
      .filter(Boolean);

    return messagingEvents.length ? messagingEvents : null;
  };

  const openLastWebhookPayload = async () => {
    try {
      if (!clientId) return;
      const res = await fetch(`https://serverowned.onrender.com/api/webhooks/last/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json();

      setLastWebhookPayload(data || null);

      const msgs = extractMessagesFromPayload(data);
      setPayloadViewMode(msgs ? "messages" : "full");

      setShowWebhookModal(true);
    } catch (err) {
      console.error("Error fetching last webhook payload:", err);
      setLastWebhookPayload(null);
      setPayloadViewMode("full");
      setShowWebhookModal(true);
    }
  };

  // Chart data
  useEffect(() => {
    if (!clientId) return;

    const fetchChartData = async () => {
      try {
        const res = await fetch(`https://serverowned.onrender.com/api/stats/${clientId}?mode=${mode}`, {
          credentials: "include",
        });
        const data = await res.json();

        const results = Array.isArray(data) ? data : data.chartResults || [];
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
  }, [mode, clientId]);

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

  async function fetchStats() {
    try {
      const res = await fetch(`https://serverowned.onrender.com/api/stats/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json();
      setStats(data);
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

      if (res.ok) navigate("/");
      else console.error("Logout failed");
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

        const bySource = {
          web: data.filter((c) => c.source === "web").length,
          messenger: data.filter((c) => c.source === "messenger").length,
          instagram: data.filter((c) => c.source === "instagram").length,
          whatsapp: data.filter((c) => c.source === "whatsapp").length,
        };

        setConversationStats({
          totalConversations: total,
          avgMessages: avg,
          activeToday: today,
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
    if (showConvoModal) viewConvos(clientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource, showConvoModal]);

  const { used, quota } = stats;
  const remaining = quota - used;

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
  };

  const statusBadge = (status) => {
    if (status === "error") return "bg-red-100 text-red-700 border-red-200";
    if (status === "warning") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-green-100 text-green-700 border-green-200";
  };

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

        {/* ✅ NEW: Warnings / Health */}
        <Card className="p-4 border-l-4 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">System Warnings</CardTitle>
            <div className={`text-xs px-2 py-1 rounded border ${statusBadge(health.status)}`}>
              {healthLoading ? "checking..." : health.status}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              These are simple checks to warn you if something might affect message delivery or response quality.
            </p>

            {health.warnings?.length ? (
              <div className="space-y-2">
                {health.warnings.map((w, i) => (
                  <div key={i} className="text-sm rounded-lg border bg-white p-3">
                    <div className="font-medium text-slate-800">
                      {w.severity === "error" ? "❌" : "⚠️"} {w.message}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Code: {w.code}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                ✅ No warnings right now.
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchClientHealth}>
                Refresh Warnings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connect Facebook Page */}
        <Card className="p-4 border-l-4 border-blue-600">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Facebook Page Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">Connect your Facebook Page to enable Messenger chatbot features and manage messages directly.</p>

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
                window.location.href = `https://serverowned.onrender.com/auth/facebook?clientId=${encodeURIComponent(clientId)}`;
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg"
            >
              Connect Facebook Page
            </Button>
{/* ✅ Page Engagement (for pages_read_engagement review) */}
<Card className="p-4 border-l-4 border-purple-600">
  <CardHeader>
    <CardTitle className="text-lg font-semibold">Page Engagement (Posts & Comments)</CardTitle>
  </CardHeader>

  <CardContent className="space-y-3">
    <p className="text-sm text-slate-600">
      This section reads your Page posts and comments to help you manage engagement in one dashboard.
    </p>

    {!pageId ? (
      <div className="text-sm text-slate-500">
        Connect your Page first to load posts and comments.
      </div>
    ) : (
      <>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRecentPosts} disabled={postsLoading}>
            {postsLoading ? "Loading posts..." : "Load recent posts"}
          </Button>
        </div>

        {postsError ? (
          <div className="text-xs text-red-600 break-words">
            Failed to load posts: {postsError}
          </div>
        ) : null}

        <div className="space-y-2">
          {(posts || []).map((p) => (
            <div key={p.id} className="border rounded-lg bg-white p-3">
              <div className="text-xs text-slate-500">
                {p.created_time ? new Date(p.created_time).toLocaleString() : "—"}
              </div>

              <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">
                {p.message || "(No message text)"}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {p.permalink_url ? (
                  <a className="text-xs underline text-slate-600" href={p.permalink_url} target="_blank" rel="noreferrer">
                    Open on Facebook
                  </a>
                ) : null}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadComments(p.id)}
                  disabled={commentsLoading && selectedPostId === p.id}
                >
                  {commentsLoading && selectedPostId === p.id ? "Loading comments..." : "View comments"}
                </Button>
              </div>

              {selectedPostId === p.id ? (
                <div className="mt-3 space-y-2">
                  {commentsError ? (
                    <div className="text-xs text-red-600 break-words">
                      Failed to load comments: {commentsError}
                    </div>
                  ) : null}

                  {(comments || []).length ? (
                    comments.map((c) => (
                      <div key={c.id} className="text-sm bg-slate-50 border rounded p-2">
                        <div className="text-xs text-slate-500">
                          {c.from?.name ? `From: ${c.from.name}` : "From: (hidden)"} •{" "}
                          {c.created_time ? new Date(c.created_time).toLocaleString() : "—"}
                        </div>
                        <div className="mt-1 text-slate-800 whitespace-pre-wrap">{c.message || "(No text)"}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">
                      {commentsLoading ? "Loading..." : "No comments found."}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}

          {!postsLoading && pageId && (!posts || posts.length === 0) ? (
            <div className="text-sm text-slate-500">
              No posts loaded yet. Click “Load recent posts”.
            </div>
          ) : null}
        </div>
      </>
    )}
  </CardContent>
</Card>

            {/* Webhook Subscription */}
            <div className="mt-4 border rounded-xl p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-800">Webhook Subscription</div>
                  <p className="text-xs text-slate-600 mt-1">
                    This proves your app uses <b>pages_manage_metadata</b> to subscribe the Page to events and receive webhooks.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await fetchWebhookStatus();
                      await fetchClientHealth();
                    }}
                  >
                    Refresh Status
                  </Button>
                  <Button
                    onClick={enableWebhooks}
                    disabled={!pageId || isSubscribing}
                  >
                    {isSubscribing ? "Enabling..." : "Enable Webhooks"}
                  </Button>
                </div>

                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-slate-500 text-xs">Last webhook received</div>
                  <div className="font-medium">{formatDateTime(webhookStatus.lastWebhookAt)}</div>
                  <div className="text-xs text-slate-500 mt-1">Type: {webhookStatus.lastWebhookType || "—"}</div>
                </div>

                <div className="bg-white rounded-lg p-3 border sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 text-xs">Subscribed fields</div>

                    <Button size="sm" variant="outline" onClick={() => setShowMessagesOnly((v) => !v)}>
                      {showMessagesOnly ? "Show all" : "Show messages only"}
                    </Button>
                  </div>

                  <div className="font-medium mt-2">
                    {(webhookStatus.webhookFields || []).length ? (
                      showMessagesOnly ? (webhookStatus.webhookFields.includes("messages") ? "messages" : "—") : webhookStatus.webhookFields.join(", ")
                    ) : (
                      "—"
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={openLastWebhookPayload} disabled={!clientId}>
                      View Last Payload
                    </Button>

                    <div className="text-xs text-slate-600">
                      Test tip: add a <b>comment</b> on your Page post, then click <b>Refresh Status</b>. (Requires <b>feed</b>)
                    </div>
                  </div>

                  {subscribeError ? <div className="mt-2 text-xs text-red-600">{subscribeError}</div> : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
<Card className="p-4 border-l-4 border-pink-600">
  <CardHeader>
    <CardTitle className="text-lg font-semibold">Instagram Connection (Review Proof)</CardTitle>
  </CardHeader>

  <CardContent className="space-y-3">
    <p className="text-sm text-slate-600">
      This section proves instagram_basic by showing the connected account, live profile fields, and a media list.
    </p>

    {!ig.igId ? (
      <div className="text-sm text-slate-500">
        No Instagram professional account detected on this connected Page yet.
        Make sure the Page is connected to an Instagram Professional account.
      </div>
    ) : (
      <div className="flex items-center gap-3 border rounded-lg bg-white p-3">
        {ig.igProfilePicUrl ? (
          <img
            src={ig.igProfilePicUrl}
            alt="IG profile"
            className="w-12 h-12 rounded-full border"
          />
        ) : null}

        <div className="flex-1">
          <div className="text-sm font-medium text-slate-900">
            Instagram: @{ig.igUsername || "unknown"}
          </div>
          <div className="text-xs text-slate-500">
            IG ID: {ig.igId} {ig.igName ? `• Name: ${ig.igName}` : ""}
          </div>
        </div>
      </div>
    )}

    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" onClick={fetchIgProfile} disabled={!ig.igId || igLoadingProfile}>
        {igLoadingProfile ? "Fetching profile..." : "Fetch IG Profile (Live)"}
      </Button>

      <Button variant="outline" onClick={fetchIgMedia} disabled={!ig.igId || igLoadingMedia}>
        {igLoadingMedia ? "Loading media..." : "Load Media List (Live)"}
      </Button>
    </div>

    {igError ? (
      <div className="text-xs text-red-600 break-words">
        IG error: {igError}
      </div>
    ) : null}

    {/* Live profile fields */}
    {igProfile ? (
      <div className="border rounded-lg bg-slate-50 p-3">
        <div className="text-sm font-medium text-slate-800">Live Profile Fields</div>
        <div className="text-xs text-slate-600 mt-2 space-y-1">
          <div><b>username:</b> {igProfile.username}</div>
          <div><b>name:</b> {igProfile.name}</div>
          <div><b>biography:</b> {igProfile.biography}</div>
          <div><b>followers_count:</b> {igProfile.followers_count}</div>
          <div><b>media_count:</b> {igProfile.media_count}</div>
        </div>
      </div>
    ) : null}

    {/* Media list */}
    {igMedia?.length ? (
      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-800">Media List (shown in-app)</div>
        {igMedia.slice(0, 6).map((m) => (
          <div key={m.id} className="border rounded-lg bg-white p-3">
            <div className="text-xs text-slate-500">Media ID: {m.id} • {m.media_type}</div>
            {m.media_url ? (
              <img src={m.media_url} alt="media" className="mt-2 max-h-64 rounded border" />
            ) : null}
            <div className="text-sm text-slate-800 mt-2 whitespace-pre-wrap">
              {m.caption ? m.caption.slice(0, 160) : "(No caption)"}
            </div>
          </div>
        ))}
      </div>
    ) : null}
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
                <p><span className="font-medium">Web:</span> {conversationStats.bySource?.web ?? 0}</p>
                <p><span className="font-medium">Messenger:</span> {conversationStats.bySource?.messenger ?? 0}</p>
                <p><span className="font-medium">Instagram:</span> {conversationStats.bySource?.instagram ?? 0}</p>
                <p><span className="font-medium">WhatsApp:</span> {conversationStats.bySource?.whatsapp ?? 0}</p>
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

        <input value={testPsid} onChange={(e) => setTestPsid(e.target.value)} className="border rounded p-2 text-sm w-full" />
        <Button onClick={() => sendReviewTest(pageId, testPsid)}>Send test message (Meta Send API)</Button>

        {/* Conversations Section */}
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Users size={18} className="text-sky-500" />
              <h2 className="text-xl font-semibold text-slate-900">Your Conversations</h2>
            </div>

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
                <option value="whatsapp">WhatsApp</option>
              </select>

              <Button className="w-full sm:w-auto" onClick={() => viewConvos(clientId)}>
                View All
              </Button>
            </div>
          </div>

          <div className="text-sm text-slate-500">Click "View All" to open the conversations modal with full list and export options.</div>
        </Card>

        {/* Agent Handover */}
        <Card className="p-4 border-l-4 border-blue-500">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Agent Handover</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">Toggle active status to allow agents to take over your conversations.</p>

            <div className="flex gap-3 items-center">
              <Button
                variant={handoverEnabled ? "secondary" : "outline"}
                onClick={async () => {
                  try {
                    if (!clientId) return;

                    const res = await fetch(`https://serverowned.onrender.com/api/clients/${clientId}`, {
                      credentials: "include",
                    });
                    const client = await res.json();

                    const newActive = !client.active;

                    await fetch(`https://serverowned.onrender.com/api/clients/${client.clientId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ ...client, active: newActive }),
                    });

                    await fetchHandoverStatus();
                    await fetchStats();
                    await fetchClientHealth(); // ✅ refresh warnings
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle>Client Conversations</DialogTitle>

            <div className="flex gap-2 mt-3 mb-2 flex-wrap">
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
              <Button variant={selectedSource === "instagram" ? "default" : "outline"} onClick={() => setSelectedSource("instagram")}>
                Instagram
              </Button>
              <Button variant={selectedSource === "whatsapp" ? "default" : "outline"} onClick={() => setSelectedSource("whatsapp")}>
                WhatsApp
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1 pb-4">
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

      {/* Last Webhook Payload Modal */}
      <Dialog open={showWebhookModal} onOpenChange={setShowWebhookModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Last Webhook Payload</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs text-slate-600">
              Showing: <b>{payloadViewMode === "messages" ? "Messages only" : "Full payload"}</b>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant={payloadViewMode === "full" ? "default" : "outline"} onClick={() => setPayloadViewMode("full")}>
                Full
              </Button>

              <Button
                size="sm"
                variant={payloadViewMode === "messages" ? "default" : "outline"}
                onClick={() => setPayloadViewMode("messages")}
              >
                Messages only
              </Button>
            </div>
          </div>

          <div className="text-sm text-slate-600">
            {lastWebhookPayload ? (
              (() => {
                const full = lastWebhookPayload;
                const messagesOnly = extractMessagesFromPayload(lastWebhookPayload);

                const dataToShow =
                  payloadViewMode === "messages"
                    ? messagesOnly || { note: "No message events found in this payload." }
                    : full;

                return (
                  <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(dataToShow, null, 2)}
                  </pre>
                );
              })()
            ) : (
              <div className="text-slate-500">No payload available yet. Trigger an event then try again.</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWebhookModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
