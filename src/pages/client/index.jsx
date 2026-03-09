// src/pages/ClientDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MessageSquare, Gauge, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const BASE_URL = "https://serverowned.onrender.com";
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

export default function ClientDashboard() {
  const navigate = useNavigate();

  const [clientId, setClientId] = useState(null);

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
    bySource: { web: 0, messenger: 0, instagram: 0, whatsapp: 0 },
  });

  const [currentConvos, setCurrentConvos] = useState([]);
  const [showConvoModal, setShowConvoModal] = useState(false);
  const [convoActionLoading, setConvoActionLoading] = useState({});

  const [humanRequests, setHumanRequests] = useState(0);
  const [tourRequests, setTourRequests] = useState(0);
  const [orderRequests, setOrderRequests] = useState(0);

  const [handoverEnabled, setHandoverEnabled] = useState(false);

  const [pageName, setPageName] = useState("");
  const [pageId, setPageId] = useState("");

  const [testPsid, setTestPsid] = useState("33461378173508614");

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
  const [payloadViewMode, setPayloadViewMode] = useState("full");
  const [showMessagesOnly, setShowMessagesOnly] = useState(false);

  const [health, setHealth] = useState({ status: "ok", warnings: [] });
  const [healthLoading, setHealthLoading] = useState(false);

  const [wa, setWa] = useState({
    connected: false,
    wabaId: "",
    phoneNumberId: "",
    displayPhone: "",
  });
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState("");

  const [waTemplates, setWaTemplates] = useState([]);
  const [waTemplatesLoading, setWaTemplatesLoading] = useState(false);
  const [waTemplatesError, setWaTemplatesError] = useState("");

  const [waTestTo, setWaTestTo] = useState("");
  const [waTestText, setWaTestText] = useState("✅ Test message from dashboard (WhatsApp)");
  const [waSendingTest, setWaSendingTest] = useState(false);
  const [waTestResult, setWaTestResult] = useState(null);

  const [waTemplateName, setWaTemplateName] = useState("");
  const [waTemplateLang, setWaTemplateLang] = useState("en_US");
  const [waTemplateParam1, setWaTemplateParam1] = useState("Yassin");
  const [waTemplateParam2, setWaTemplateParam2] = useState("12345");
  const [waSendingTemplate, setWaSendingTemplate] = useState(false);
  const [waTemplateResult, setWaTemplateResult] = useState(null);

  const [botReady, setBotReady] = useState(false);
  const [knowledgeVersion, setKnowledgeVersion] = useState(0);
  const [knowledgeStatusRaw, setKnowledgeStatusRaw] = useState("");
  const [buildOpen, setBuildOpen] = useState(false);
  const [buildMode, setBuildMode] = useState("form");
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [buildSuccess, setBuildSuccess] = useState("");

  const [replaceOldKnowledge, setReplaceOldKnowledge] = useState(true);
  const [coverageWarnings, setCoverageWarnings] = useState([]);
  const [sectionsPresent, setSectionsPresent] = useState([]);

  const [promptSettings, setPromptSettings] = useState({
    tone: "friendly",
    orderFlowEnabled: true,
    humanEscalationEnabled: true,
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

  const effectiveBotType = useMemo(() => {
    const picked =
      String(promptSettings.businessType || "").trim() ||
      String(botForm.businessType || "").trim() ||
      BOT_TYPE;
    return picked || "default";
  }, [promptSettings.businessType, botForm.businessType]);

  const connectDisabledReason = useMemo(() => {
    if (!clientId) return "Loading client...";
    if (!botReady) return "Build your bot first to unlock connections.";
    return "";
  }, [clientId, botReady]);

  useEffect(() => {
    setBuildError("");
    setBuildSuccess("");
  }, [buildMode, buildOpen]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`${BASE_URL}/api/me`, { credentials: "include" });
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
  }, [navigate]);

  useEffect(() => {
    if (!clientId) return;
    fetchStats();
    fetchConversationStats();
    fetchHandoverStatus();
    fetchClientPageConnection();
    fetchWebhookStatus();
    fetchClientHealth();
    fetchWhatsAppStatus();
    fetchKnowledgeGate();
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;

    const fetchChartData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/stats/${clientId}?mode=${mode}`, { credentials: "include" });
        const contentType = res.headers.get("content-type") || "";
        const raw = await res.text();

        if (!res.ok) {
          console.error("Chart API failed:", res.status, raw.slice(0, 300));
          return;
        }

        if (!contentType.includes("application/json")) {
          console.error("Chart API returned non-JSON:", contentType, raw.slice(0, 300));
          return;
        }

        const data = JSON.parse(raw);
        const results = Array.isArray(data) ? data : data.chartResults || [];
        let normalized = [];

        if (mode === "daily") {
          normalized = results.map((d) => ({ label: `${d._id}:00`, messages: d.count }));
        } else if (mode === "weekly") {
          const daysMap = { 1: "Sun", 2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat" };
          normalized = results.map((d) => ({ label: daysMap[d._id] || d._id, messages: d.count }));
        } else if (mode === "monthly") {
          normalized = results.map((d) => ({ label: String(d._id), messages: d.count }));
        }

        setChartData(normalized);
      } catch (err) {
        console.error("Error fetching chart data:", err);
      }
    };

    fetchChartData();
  }, [mode, clientId]);

  useEffect(() => {
    if (showConvoModal) {
      viewConvos();
    }
  }, [selectedSource, showConvoModal]);

  const fetchKnowledgeGate = async () => {
    try {
      if (!clientId) return;

      const r1 = await fetch(`${BASE_URL}/api/clients/${clientId}`, { credentials: "include" });
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
        `${BASE_URL}/api/knowledge/status?clientId=${encodeURIComponent(clientId)}&botType=${encodeURIComponent(effectiveBotType)}`,
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

  const submitBuild = async () => {
    try {
      if (!clientId) return;
      setBuildError("");
      setBuildSuccess("");
      setBuildLoading(true);

      if (buildMode === "form") {
        const hasAny =
          botForm.businessName.trim() ||
          botForm.businessType.trim() ||
          botForm.cityArea.trim() ||
          botForm.about.trim() ||
          botForm.hours.trim() ||
          botForm.phoneWhatsapp.trim() ||
          botForm.email.trim() ||
          botForm.address.trim() ||
          botForm.services.trim() ||
          botForm.pricing.trim() ||
          botForm.menu.trim() ||
          botForm.products.trim() ||
          botForm.faqs.trim() ||
          botForm.listingsSummary.trim() ||
          botForm.paymentPlans.trim() ||
          botForm.booking.trim() ||
          botForm.team.trim() ||
          botForm.courses.trim() ||
          botForm.rooms.trim() ||
          botForm.delivery.trim() ||
          botForm.policies.trim();

        if (!hasAny) {
          setBuildError("Please fill at least one field to build your bot.");
          return;
        }
      }

      if (buildMode === "paste" && !rawText.trim()) {
        setBuildError("Paste your text first.");
        return;
      }

      if (buildMode === "upload" && !rawFile) {
        setBuildError("Upload a .txt file first.");
        return;
      }

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
                  humanEscalation: {
                    enabled: promptSettings.humanEscalationEnabled,
                    token: "[Human_request]",
                  },
                  orderFlow: {
                    enabled: promptSettings.orderFlowEnabled,
                    token: "[ORDER_REQUEST]",
                  },
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
          const res = await fetch(`${BASE_URL}/api/knowledge/build`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });

          const json = await res.json().catch(() => ({}));
          lastJson = json;
          if (res.ok && (json.ok || json.success || json.status === "ok")) ok = true;
        } catch {
          // ignore and try fallback
        }
      }

      if (!ok && buildMode === "upload") {
        try {
          const fd = new FormData();
          fd.append("clientId", clientId);
          fd.append("section", rawSection);
          fd.append("botType", effectiveBotType);
          fd.append("replace", String(Boolean(replaceOldKnowledge)));
          fd.append("file", rawFile);

          const res = await fetch(`${BASE_URL}/api/knowledge/upload`, {
            method: "POST",
            credentials: "include",
            body: fd,
          });

          const json = await res.json().catch(() => ({}));
          lastJson = json;
          if (res.ok && (json.ok || json.success || json.status === "ok")) ok = true;
        } catch {
          // ignore and try fallback
        }
      }

      if (!ok) {
        const res = await fetch(`${BASE_URL}/api/knowledge/rebuild/${encodeURIComponent(clientId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            botType: effectiveBotType,
            replace: Boolean(replaceOldKnowledge),
          }),
        });

        const json = await res.json().catch(() => ({}));
        lastJson = json;
        if (res.ok) ok = Boolean(json.ok ?? json.success ?? true);
      }

      if (!ok) {
        setBuildError(`Build failed. Server response:\n${JSON.stringify(lastJson || {}, null, 2).slice(0, 1200)}`);
        return;
      }

      setBuildSuccess("✅ Bot built successfully. Connections are now unlocked.");
      setBuildOpen(false);

      await fetchKnowledgeGate();
      await fetchClientHealth();
    } catch (e) {
      setBuildError(e?.message || "Build failed.");
    } finally {
      setBuildLoading(false);
    }
  };

  const fetchClientHealth = async () => {
    try {
      if (!clientId) return;
      setHealthLoading(true);

      const res = await fetch(`${BASE_URL}/api/clients/${clientId}/health`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setHealth({
          status: data.status || "ok",
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
        });
      } else {
        setHealth({
          status: "warning",
          warnings: [
            {
              code: "HEALTH_FETCH_FAILED",
              severity: "warn",
              message: data?.error || "Could not load warnings.",
            },
          ],
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

  const fetchClientPageConnection = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/clients/${clientId}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));

      setPageName(data?.PAGE_NAME || "");
      setPageId(data?.pageId || "");

      setBotForm((prev) => ({
        ...prev,
        businessName: prev.businessName || data?.businessName || data?.PAGE_NAME || "",
      }));

      setCoverageWarnings(Array.isArray(data?.coverageWarnings) ? data.coverageWarnings : []);
      setSectionsPresent(Array.isArray(data?.sectionsPresent) ? data.sectionsPresent : []);
    } catch (err) {
      console.error("Error fetching client page connection:", err);
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      if (!clientId) return;
      const res = await fetch(`${BASE_URL}/api/whatsapp/status?clientId=${encodeURIComponent(clientId)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setWa({
          connected: Boolean(data.connected),
          wabaId: data.wabaId || "",
          phoneNumberId: data.phoneNumberId || "",
          displayPhone: data.displayPhone || "",
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWebhookStatus = async () => {
    try {
      if (!clientId) return;
      const res = await fetch(`${BASE_URL}/api/webhooks/status/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
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

  const enableWebhooks = async () => {
    try {
      if (!clientId) return;
      setIsSubscribing(true);
      setSubscribeError("");

      const res = await fetch(`${BASE_URL}/api/webhooks/subscribe/${clientId}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        setSubscribeError(data?.error || "Subscription failed (no success=true returned)");
      }

      await fetchWebhookStatus();
      await fetchClientHealth();
    } catch (err) {
      console.error("Enable webhooks error:", err);
      setSubscribeError("Subscription failed (network/server error)");
    } finally {
      setIsSubscribing(false);
    }
  };

  const sendWaTest = async () => {
    try {
      if (!clientId) return;
      setWaError("");
      setWaTestResult(null);
      setWaSendingTest(true);

      const res = await fetch(`${BASE_URL}/whatsapp/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId,
          to: waTestTo,
          text: waTestText,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setWaError(JSON.stringify(json.error || json));
        return;
      }

      setWaTestResult(json);
    } catch (e) {
      setWaError(e.message);
    } finally {
      setWaSendingTest(false);
    }
  };

  const fetchWaTemplates = async () => {
    try {
      if (!clientId) return;
      setWaTemplatesError("");
      setWaTemplatesLoading(true);

      const res = await fetch(`${BASE_URL}/whatsapp/templates?clientId=${encodeURIComponent(clientId)}`, {
        credentials: "include",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setWaTemplatesError(JSON.stringify(json.error || json));
        setWaTemplates([]);
        return;
      }

      const list = Array.isArray(json.templates) ? json.templates : [];
      setWaTemplates(list);

      const approved = list.find((t) => String(t.status).toUpperCase() === "APPROVED") || list[0];
      if (approved?.name) {
        setWaTemplateName(approved.name);
        if (approved.language) setWaTemplateLang(approved.language);
      }
    } catch (e) {
      setWaTemplatesError(e.message);
    } finally {
      setWaTemplatesLoading(false);
    }
  };

  const sendWaTemplateTest = async () => {
    try {
      if (!clientId) return;
      setWaError("");
      setWaTemplateResult(null);
      setWaSendingTemplate(true);

      if (!waTemplateName.trim()) {
        setWaError("Pick an approved template first.");
        return;
      }

      const res = await fetch(`${BASE_URL}/whatsapp/send-template-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId,
          to: waTestTo,
          templateName: waTemplateName,
          languageCode: waTemplateLang,
          params: [waTemplateParam1, waTemplateParam2],
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setWaError(JSON.stringify(json.error || json.details || json));
        return;
      }

      setWaTemplateResult(json);
    } catch (e) {
      setWaError(e.message);
    } finally {
      setWaSendingTemplate(false);
    }
  };

  const connectWhatsApp = () => {
    window.location.href = `${BASE_URL}/auth/whatsapp?clientId=${clientId}`;
  };

  const extractMessagesFromPayload = (payload) => {
    if (!payload) return null;

    const raw = payload?.lastWebhookPayload || payload;

    const waMessages = (raw?.entry || [])
      .flatMap((e) => e?.changes || [])
      .flatMap((c) => c?.value?.messages || [])
      .filter(Boolean);

    if (waMessages.length) return waMessages;

    const messagingEvents = (raw?.entry || []).flatMap((e) => e?.messaging || []).filter(Boolean);

    return messagingEvents.length ? messagingEvents : null;
  };

  const openLastWebhookPayload = async () => {
    try {
      if (!clientId) return;
      const res = await fetch(`${BASE_URL}/api/webhooks/last/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

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

  async function sendReviewTest(pageIdValue, psid) {
    const r = await fetch(`${BASE_URL}/api/review/send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pageId: pageIdValue, psid, text: "Your appointment has been scheduled." }),
    });

    const data = await r.json().catch(() => ({}));
    if (data.ok) alert("Sent ✅");
    else alert("Failed ❌ (check server logs)");
  }

  const fetchHandoverStatus = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/clients/${clientId}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      setHandoverEnabled(Boolean(data.active));
    } catch (err) {
      console.error("Error fetching handover status:", err);
    }
  };

  async function fetchStats() {
    try {
      const res = await fetch(`${BASE_URL}/api/stats/${clientId}`, { credentials: "include" });
      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();

      if (!res.ok) {
        console.error("Stats API failed:", res.status, raw.slice(0, 300));
        return;
      }
      if (!contentType.includes("application/json")) {
        console.error("Stats API returned non-JSON:", contentType, raw.slice(0, 300));
        return;
      }

      const data = JSON.parse(raw);
      setStats(data);
      setHumanRequests(data.totalHumanRequests || 0);
      setTourRequests(data.totalTourRequests || 0);
      setOrderRequests(data.totalorderRequests || 0);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  async function fetchConversationStats() {
    try {
      const res = await fetch(`${BASE_URL}/api/conversations/${clientId}`, { credentials: "include" });
      const data = await res.json().catch(() => ([]));

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
      const res = await fetch(`${BASE_URL}/api/conversations/${clientId}${query}`, { credentials: "include" });
      const data = await res.json().catch(() => ([]));
      setCurrentConvos(Array.isArray(data) ? data : []);
      setShowConvoModal(true);
    } catch (err) {
      console.error("Error fetching client conversations:", err);
    }
  };

  const resumeMessengerConversation = async (convo) => {
    const userId = convo?.userId || convo?.psid || convo?.user;
    const actionKey = `${convo.pageId || pageId}:${userId}`;

    try {
      setConvoActionLoading((prev) => ({ ...prev, [actionKey]: true }));

      const res = await fetch(`${BASE_URL}/webhook/resume-conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pageId: convo?.pageId || pageId,
          userId,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        alert(json?.error || "Could not resume conversation.");
        return;
      }

      setCurrentConvos((prev) =>
        prev.map((item) =>
          (item._id && convo._id && item._id === convo._id) ||
          (item.pageId === convo.pageId && (item.userId || item.psid) === (convo.userId || convo.psid))
            ? {
                ...item,
                humanEscalation: false,
                botResumeAt: null,
                resumedBy: "dashboard",
                resumedAt: new Date().toISOString(),
              }
            : item
        )
      );

      await fetchConversationStats();
      await fetchStats();
    } catch (err) {
      console.error("resumeMessengerConversation error:", err);
      alert("Could not resume conversation.");
    } finally {
      setConvoActionLoading((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const resumeInstagramConversation = async (convo) => {
    const userId = convo?.userId || convo?.psid || convo?.user;
    const igBusinessId = convo?.igBusinessId;
    const actionKey = `${igBusinessId || "ig"}:${userId}`;

    try {
      setConvoActionLoading((prev) => ({ ...prev, [actionKey]: true }));

      const res = await fetch(`${BASE_URL}/instagram/resume-conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          igBusinessId,
          userId,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        alert(json?.error || "Could not resume Instagram conversation.");
        return;
      }

      setCurrentConvos((prev) =>
        prev.map((item) =>
          (item._id && convo._id && item._id === convo._id) ||
          (item.igBusinessId === convo.igBusinessId && (item.userId || item.psid) === (convo.userId || convo.psid))
            ? {
                ...item,
                humanEscalation: false,
                botResumeAt: null,
                resumedBy: "dashboard",
                resumedAt: new Date().toISOString(),
              }
            : item
        )
      );

      await fetchConversationStats();
      await fetchStats();
    } catch (err) {
      console.error("resumeInstagramConversation error:", err);
      alert("Could not resume Instagram conversation.");
    } finally {
      setConvoActionLoading((prev) => ({ ...prev, [actionKey]: false }));
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
          rows.push([idx, c.source || "", msg.role, String(msg.content || "").replace(/,/g, " ")]);
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

  const handleLogout = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/logout`, { method: "POST", credentials: "include" });
      if (res.ok) navigate("/");
      else console.error("Logout failed");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const used = stats.used;
  const quota = stats.quota;
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

  const buildBadge = () => {
    if (!clientId) return "checking...";
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

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Client Dashboard</h1>
            <p className="text-slate-500 mt-1">Your personal usage and conversations.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        <Card className="p-4 border-l-4 border-slate-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Bot Setup</CardTitle>
            <div className={`text-xs px-2 py-1 rounded border ${buildBadgeClass()}`}>
              {buildBadge()} • v{Number(knowledgeVersion || 0)}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Add your business data once. We’ll convert it into knowledge chunks to power your chatbot. After it’s built,
              connections are unlocked.
            </p>

            {!botReady ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                🔒 Connections are locked until your bot is built.
              </div>
            ) : (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                ✅ Bot is built. Connections are unlocked.
              </div>
            )}

            <div className="flex items-center justify-between border rounded-lg p-3 bg-slate-50">
              <div>
                <div className="text-sm font-medium text-slate-800">Replace old knowledge</div>
                <div className="text-xs text-slate-600">
                  If ON, we wipe old saved files + chunks first to prevent mixed business data.
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

            {botReady ? (
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
                        <div key={i} className="text-xs text-orange-700">
                          ⚠️ {w}
                        </div>
                      ))}
                      {coverageWarnings.length > 4 ? (
                        <div className="text-xs text-slate-500">+{coverageWarnings.length - 4} more…</div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-green-700 mt-1">✅ Looks good</div>
                  )}
                </div>
              </div>
            ) : null}

            {buildSuccess ? (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{buildSuccess}</div>
            ) : null}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setBuildOpen(true)} disabled={!clientId}>
                {botReady ? "Edit / Rebuild Bot" : "Build Your Bot"}
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  await fetchKnowledgeGate();
                  await fetchClientHealth();
                }}
                disabled={!clientId}
              >
                Refresh Bot Status
              </Button>
            </div>

            <div className="text-xs text-slate-500">
              Tip: Quick Form for basics. Paste Text / Upload for long data. Use headings like <b>## FAQs</b>, <b>## Menu</b>, <b>## Products</b> or separators like <b>---</b> between items.
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 border-l-4 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">System Warnings</CardTitle>
            <div className={`text-xs px-2 py-1 rounded border ${statusBadge(health.status)}`}>
              {healthLoading ? "checking..." : health.status}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Simple checks to warn you if something might affect message delivery or response quality.
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

        <Card className="p-4 border-l-4 border-blue-600">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Facebook Page Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Connect your Facebook Page to enable Messenger chatbot features and manage messages directly.
            </p>

            {!botReady ? (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                🔒 {connectDisabledReason}
              </div>
            ) : null}

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
                window.location.href = `${BASE_URL}/auth/facebook?clientId=${encodeURIComponent(clientId)}`;
              }}
              disabled={!botReady}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50"
              title={!botReady ? connectDisabledReason : ""}
            >
              Connect Facebook Page
            </Button>

            <div className="mt-4 border rounded-xl p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-[240px]">
                  <div className="font-semibold text-slate-800">Webhook Subscription</div>
                  <p className="text-xs text-slate-600 mt-1">
                    Proves <b>pages_manage_metadata</b> to subscribe the Page to events and receive webhooks.
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
                  <Button onClick={enableWebhooks} disabled={!pageId || isSubscribing}>
                    {isSubscribing ? "Enabling..." : "Enable Webhooks"}
                  </Button>
                </div>

                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-slate-500 text-xs">Last webhook received</div>
                  <div className="font-medium">{formatDateTime(webhookStatus.lastWebhookAt)}</div>
                  <div className="text-xs text-slate-500 mt-1">Type: {webhookStatus.lastWebhookType || "—"}</div>
                </div>

                <div className="bg-white rounded-lg p-3 border w-full sm:w-auto">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-500 text-xs">Subscribed fields</div>

                    <Button size="sm" variant="outline" onClick={() => setShowMessagesOnly((v) => !v)}>
                      {showMessagesOnly ? "Show all" : "Show messages only"}
                    </Button>
                  </div>

                  <div className="font-medium mt-2">
                    {(webhookStatus.webhookFields || []).length ? (
                      showMessagesOnly ? (
                        webhookStatus.webhookFields.includes("messages") ? "messages" : "—"
                      ) : (
                        webhookStatus.webhookFields.join(", ")
                      )
                    ) : (
                      "—"
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={openLastWebhookPayload} disabled={!clientId}>
                      View Last Payload
                    </Button>

                    <div className="text-xs text-slate-600">
                      Test tip: add a <b>comment</b> on your Page post, then click <b>Refresh Status</b>.
                    </div>
                  </div>

                  {subscribeError ? <div className="mt-2 text-xs text-red-600">{subscribeError}</div> : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 border-l-4 border-emerald-600">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">WhatsApp Connection (Embedded Signup)</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {!botReady ? (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                🔒 {connectDisabledReason}
              </div>
            ) : null}

            <p className="text-sm text-slate-600">Connect WhatsApp via Meta Embedded Signup.</p>

            {wa.connected ? (
              <div className="border rounded-lg bg-white p-3 text-sm">
                <div>
                  <b>Status:</b> ✅ Connected
                </div>
                <div>
                  <b>WABA ID:</b> {wa.wabaId || "—"}
                </div>
                <div>
                  <b>Phone Number ID:</b> {wa.phoneNumberId || "—"}
                </div>
                <div>
                  <b>Display Phone:</b> {wa.displayPhone || "—"}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Not connected yet.</div>
            )}

            {waError ? <div className="text-xs text-red-600 break-words">{waError}</div> : null}

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={connectWhatsApp}
                disabled={!clientId || waLoading || !botReady}
                title={!botReady ? connectDisabledReason : ""}
              >
                {waLoading ? "Connecting..." : "Connect WhatsApp"}
              </Button>

              <Button variant="outline" onClick={fetchWhatsAppStatus} disabled={!clientId}>
                Refresh Status
              </Button>

              <Button
                variant="outline"
                onClick={fetchWaTemplates}
                disabled={!clientId || !wa.connected || waTemplatesLoading || !botReady}
              >
                {waTemplatesLoading ? "Syncing..." : "Sync Templates"}
              </Button>
            </div>

            <div className="border rounded-lg bg-white p-3 space-y-2">
              <div className="text-sm font-medium text-slate-800">Send an Approved Template (App Review Proof)</div>

              <div className="text-xs text-slate-500">
                Required: pick an <b>APPROVED</b> template, send from this UI, then show it delivered in the native WhatsApp app.
              </div>

              {waTemplatesError ? <div className="text-xs text-red-600 break-words">{waTemplatesError}</div> : null}

              <label className="text-xs text-slate-600">Approved template</label>
              <select
                value={waTemplateName}
                onChange={(e) => setWaTemplateName(e.target.value)}
                className="border rounded p-2 text-sm w-full"
                disabled={!botReady || !wa.connected}
              >
                <option value="">Select template...</option>
                {(waTemplates || [])
                  .filter((t) => String(t.status || "").toUpperCase() === "APPROVED")
                  .map((t) => (
                    <option key={`${t.name}:${t.language || ""}`} value={t.name}>
                      {t.name} (APPROVED){t.language ? ` • ${t.language}` : ""}
                    </option>
                  ))}
              </select>

              <label className="text-xs text-slate-600">Language code</label>
              <input
                value={waTemplateLang}
                onChange={(e) => setWaTemplateLang(e.target.value)}
                placeholder="en_US"
                className="border rounded p-2 text-sm w-full"
                disabled={!botReady || !wa.connected}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-600">Param {"{{1}}"}</label>
                  <input
                    value={waTemplateParam1}
                    onChange={(e) => setWaTemplateParam1(e.target.value)}
                    className="border rounded p-2 text-sm w-full"
                    disabled={!botReady || !wa.connected}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600">Param {"{{2}}"}</label>
                  <input
                    value={waTemplateParam2}
                    onChange={(e) => setWaTemplateParam2(e.target.value)}
                    className="border rounded p-2 text-sm w-full"
                    disabled={!botReady || !wa.connected}
                  />
                </div>
              </div>

              <label className="text-xs text-slate-600">Recipient (test number)</label>
              <input
                value={waTestTo}
                onChange={(e) => setWaTestTo(e.target.value)}
                placeholder="Recipient number (e.g. +2011xxxxxxx)"
                className="border rounded p-2 text-sm w-full"
                disabled={!botReady}
              />

              <div className="flex gap-2 flex-wrap items-center">
                <Button
                  onClick={sendWaTemplateTest}
                  disabled={waSendingTemplate || !wa.connected || !botReady || !waTestTo.trim() || !waTemplateName.trim()}
                >
                  {waSendingTemplate ? "Sending..." : "Send Template Message"}
                </Button>

                {waTemplateResult?.ok ? <div className="text-xs text-green-700">Sent ✅</div> : null}
              </div>

              {waTemplateResult ? (
                <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(waTemplateResult, null, 2)}
                </pre>
              ) : null}
            </div>

            <div className="border rounded-lg bg-white p-3 space-y-2">
              <div className="text-sm font-medium text-slate-800">Send a WhatsApp Text Message (Debug Only)</div>

              <div className="text-xs text-slate-500">
                App Review usually wants <b>template</b> sending proof. Use this only for internal testing.
              </div>

              <textarea
                value={waTestText}
                onChange={(e) => setWaTestText(e.target.value)}
                placeholder="Message text"
                className="border rounded p-2 text-sm w-full min-h-[90px]"
                disabled={!botReady}
              />

              <div className="flex gap-2 flex-wrap items-center">
                <Button
                  onClick={sendWaTest}
                  disabled={waSendingTest || !waTestTo.trim() || !waTestText.trim() || !wa.connected || !botReady}
                >
                  {waSendingTest ? "Sending..." : "Send WhatsApp Text"}
                </Button>

                {waTestResult?.ok ? <div className="text-xs text-green-700">Sent ✅</div> : null}
              </div>

              {waTestResult ? (
                <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(waTestResult, null, 2)}
                </pre>
              ) : null}
            </div>
          </CardContent>
        </Card>

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
              <div className="text-3xl font-bold text-slate-900">{orderRequests}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-150">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-700">
                <Users size={18} className="text-violet-500" />
                <div className="text-sm">Tour Requests</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-slate-900">{tourRequests}</div>
            </CardContent>
          </Card>
        </div>

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

        <Card className="p-5">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Send test message (Meta Send API)</h2>
            <input
              value={testPsid}
              onChange={(e) => setTestPsid(e.target.value)}
              className="border rounded p-2 text-sm w-full"
            />
            <Button onClick={() => sendReviewTest(pageId, testPsid)} disabled={!botReady} title={!botReady ? connectDisabledReason : ""}>
              Send test message
            </Button>
          </div>
        </Card>

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

              <Button className="w-full sm:w-auto" onClick={viewConvos}>
                View All
              </Button>
            </div>
          </div>

          <div className="text-sm text-slate-500">
            Open the modal to view conversation details. Messenger and Instagram conversations in human mode get a per-conversation resume button.
          </div>
        </Card>

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

                    const res = await fetch(`${BASE_URL}/api/clients/${clientId}`, { credentials: "include" });
                    const client = await res.json().catch(() => ({}));

                    const newActive = !client.active;

                    await fetch(`${BASE_URL}/api/clients/${client.clientId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ ...client, active: newActive }),
                    });

                    await fetchHandoverStatus();
                    await fetchStats();
                    await fetchClientHealth();
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

      <Dialog open={buildOpen} onOpenChange={setBuildOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{botReady ? "Edit / Rebuild Bot" : "Build Your Bot"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              Add your business data and bot behavior. We’ll convert your data into knowledge chunks and use your settings to control how the bot replies.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-xl p-4 bg-slate-50">
              <div className="space-y-2">
                <label className="text-xs text-slate-600">Business type template</label>
                <select
                  value={promptSettings.businessType}
                  onChange={(e) => setPromptSettings((p) => ({ ...p, businessType: e.target.value }))}
                  className="border rounded p-2 text-sm w-full bg-white"
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
                  className="border rounded p-2 text-sm w-full bg-white"
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
            </div>

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

            {buildMode !== "form" ? (
              <div className="space-y-2">
                <label className="text-xs text-slate-600">Content type</label>
                <select value={rawSection} onChange={(e) => setRawSection(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full">
                  {RAW_SECTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {buildMode === "form" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={botForm.businessName}
                  onChange={(e) => setBotForm((p) => ({ ...p, businessName: e.target.value }))}
                  placeholder="Business name"
                  className="border rounded p-2 text-sm w-full"
                />

                <input
                  value={botForm.businessType}
                  onChange={(e) => setBotForm((p) => ({ ...p, businessType: e.target.value }))}
                  placeholder="Business type text (optional, e.g. restaurant, clinic, real estate)"
                  className="border rounded p-2 text-sm w-full"
                />

                <input
                  value={botForm.cityArea}
                  onChange={(e) => setBotForm((p) => ({ ...p, cityArea: e.target.value }))}
                  placeholder="City / areas served"
                  className="border rounded p-2 text-sm w-full"
                />

                <input
                  value={botForm.phoneWhatsapp}
                  onChange={(e) => setBotForm((p) => ({ ...p, phoneWhatsapp: e.target.value }))}
                  placeholder="Phone / WhatsApp"
                  className="border rounded p-2 text-sm w-full"
                />

                <input
                  value={botForm.email}
                  onChange={(e) => setBotForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  className="border rounded p-2 text-sm w-full"
                />

                <input
                  value={botForm.address}
                  onChange={(e) => setBotForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Address / location"
                  className="border rounded p-2 text-sm w-full"
                />

                <input
                  value={botForm.hours}
                  onChange={(e) => setBotForm((p) => ({ ...p, hours: e.target.value }))}
                  placeholder="Working hours"
                  className="border rounded p-2 text-sm w-full md:col-span-2"
                />

                <textarea
                  value={botForm.about}
                  onChange={(e) => setBotForm((p) => ({ ...p, about: e.target.value }))}
                  placeholder="About the business"
                  className="border rounded p-2 text-sm w-full min-h-[80px] md:col-span-2"
                />

                <textarea
                  value={botForm.services}
                  onChange={(e) => setBotForm((p) => ({ ...p, services: e.target.value }))}
                  placeholder="Services"
                  className="border rounded p-2 text-sm w-full min-h-[80px] md:col-span-2"
                />

                <textarea
                  value={botForm.pricing}
                  onChange={(e) => setBotForm((p) => ({ ...p, pricing: e.target.value }))}
                  placeholder="Pricing / packages"
                  className="border rounded p-2 text-sm w-full min-h-[80px] md:col-span-2"
                />

                <textarea
                  value={botForm.menu}
                  onChange={(e) => setBotForm((p) => ({ ...p, menu: e.target.value }))}
                  placeholder="Menu"
                  className="border rounded p-2 text-sm w-full min-h-[100px] md:col-span-2"
                />

                <textarea
                  value={botForm.products}
                  onChange={(e) => setBotForm((p) => ({ ...p, products: e.target.value }))}
                  placeholder="Products / catalog"
                  className="border rounded p-2 text-sm w-full min-h-[100px] md:col-span-2"
                />

                <textarea
                  value={botForm.listingsSummary}
                  onChange={(e) => setBotForm((p) => ({ ...p, listingsSummary: e.target.value }))}
                  placeholder="Items / listings / properties summary"
                  className="border rounded p-2 text-sm w-full min-h-[100px] md:col-span-2"
                />

                <textarea
                  value={botForm.paymentPlans}
                  onChange={(e) => setBotForm((p) => ({ ...p, paymentPlans: e.target.value }))}
                  placeholder="Payment / pricing / installment plans"
                  className="border rounded p-2 text-sm w-full min-h-[100px] md:col-span-2"
                />

                <textarea
                  value={botForm.booking}
                  onChange={(e) => setBotForm((p) => ({ ...p, booking: e.target.value }))}
                  placeholder="Bookings / appointments / reservations"
                  className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2"
                />

                <textarea
                  value={botForm.team}
                  onChange={(e) => setBotForm((p) => ({ ...p, team: e.target.value }))}
                  placeholder="Team / doctors / staff"
                  className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2"
                />

                <textarea
                  value={botForm.courses}
                  onChange={(e) => setBotForm((p) => ({ ...p, courses: e.target.value }))}
                  placeholder="Courses / programs"
                  className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2"
                />

                <textarea
                  value={botForm.rooms}
                  onChange={(e) => setBotForm((p) => ({ ...p, rooms: e.target.value }))}
                  placeholder="Rooms / accommodation"
                  className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2"
                />

                <textarea
                  value={botForm.delivery}
                  onChange={(e) => setBotForm((p) => ({ ...p, delivery: e.target.value }))}
                  placeholder="Delivery / shipping"
                  className="border rounded p-2 text-sm w-full min-h-[90px] md:col-span-2"
                />

                <textarea
                  value={botForm.policies}
                  onChange={(e) => setBotForm((p) => ({ ...p, policies: e.target.value }))}
                  placeholder="Policies"
                  className="border rounded p-2 text-sm w-full min-h-[80px] md:col-span-2"
                />

                <textarea
                  value={botForm.faqs}
                  onChange={(e) => setBotForm((p) => ({ ...p, faqs: e.target.value }))}
                  placeholder="FAQs"
                  className="border rounded p-2 text-sm w-full min-h-[120px] md:col-span-2"
                />
              </div>
            ) : null}

            {buildMode === "paste" ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">
                  Best format: headings like <b>## FAQs</b>, <b>## Menu</b>, <b>## Products</b>, <b>## Booking</b>, <b>## Policies</b> and use <b>---</b> between items.
                </div>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste your data here..."
                  className="border rounded p-2 text-sm w-full min-h-[220px]"
                />
              </div>
            ) : null}

            {buildMode === "upload" ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">Upload a .txt file.</div>
                <input type="file" accept=".txt,text/plain" onChange={(e) => setRawFile(e.target.files?.[0] || null)} className="text-sm" />
                {rawFile ? <div className="text-xs text-slate-600">Selected: {rawFile.name}</div> : null}
              </div>
            ) : null}

            {buildError ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 whitespace-pre-wrap">{buildError}</div>
            ) : null}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setBuildOpen(false)} disabled={buildLoading}>
              Cancel
            </Button>
            <Button onClick={submitBuild} disabled={buildLoading}>
              {buildLoading ? "Building..." : "Build Bot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConvoModal} onOpenChange={setShowConvoModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle>Client Conversations</DialogTitle>

            <div className="flex gap-2 mt-3 mb-2 flex-wrap">
              <Button variant={selectedSource === "all" ? "default" : "outline"} onClick={() => setSelectedSource("all")}>
                All
              </Button>
              <Button variant={selectedSource === "web" ? "default" : "outline"} onClick={() => setSelectedSource("web")}>
                Web
              </Button>
              <Button variant={selectedSource === "messenger" ? "default" : "outline"} onClick={() => setSelectedSource("messenger")}>
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
              currentConvos.map((c, idx) => {
                const convoUserId = c.user || c.userId || c.psid || "Unknown user";
                const convoKey =
                  c.source === "instagram"
                    ? `${c.igBusinessId || "ig"}:${c.userId || c.psid || c.user || idx}`
                    : `${c.pageId || pageId}:${c.userId || c.psid || c.user || idx}`;

                const isMessenger = c.source === "messenger";
                const isInstagram = c.source === "instagram";
                const canResume = isMessenger || isInstagram;
                const isHumanMode = Boolean(c.humanEscalation);

                return (
                  <div key={c._id || idx} className="border rounded-lg p-3 bg-white shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <p className="text-red-500 font-semibold mb-1">Conversation #{idx + 1}</p>
                        <p className="font-medium">{convoUserId}</p>
                        <div className="text-xs text-slate-500 mt-1">
                          Source: {c.source || "—"} • Updated: {formatDateTime(c.updatedAt)}
                        </div>

                        {canResume ? (
                          <div className="flex items-center gap-2">
                            {isHumanMode ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  isInstagram ? resumeInstagramConversation(c) : resumeMessengerConversation(c)
                                }
                                disabled={Boolean(convoActionLoading[convoKey])}
                              >
                                {convoActionLoading[convoKey] ? "Resuming..." : "Resume Bot"}
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                Bot Active
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {isMessenger ? (
                        <div className="flex items-center gap-2">
                          {isHumanMode ? (
                            <Button
                              size="sm"
                              onClick={() => resumeMessengerConversation(c)}
                              disabled={Boolean(convoActionLoading[convoKey])}
                            >
                              {convoActionLoading[convoKey] ? "Resuming..." : "Resume Bot"}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              Bot Active
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className="pl-2 space-y-2 mt-3">
                      {c.history?.length ? (
                        c.history.map((msg, i) => (
                          <p key={i} className="text-sm">
                            <strong className={msg.role === "user" ? "text-slate-800" : "text-sky-600"}>
                              {msg.role === "user" ? "User" : "Assistant"}:
                            </strong>{" "}
                            {msg.content}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400">No messages</p>
                      )}
                    </div>
                  </div>
                );
              })
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
                  payloadViewMode === "messages" ? messagesOnly || { note: "No message events found in this payload." } : full;

                return <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto">{JSON.stringify(dataToShow, null, 2)}</pre>;
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