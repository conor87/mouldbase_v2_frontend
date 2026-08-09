// MouldDetails_Tpm.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getCurrentUser } from "../../auth.js";

// Helpery
const pickFirst = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pl-PL");
};

const toSortableDate = (value) => {
  if (!value) return 0;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getTime();
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// enumy (dopasowane do modelu TPM)
const STATUS_OPTIONS = [
  { value: 0, label: "Otwarty" },
  { value: 1, label: "W trakcie realizacji" },
  { value: 2, label: "Zamknięty" },
  { value: 3, label: "Odrzucony" },
];

const TIME_OPTIONS = [
  { value: 0, label: "Natychmiast" },
  { value: 1, label: "W trakcie przeglądu" },
  { value: 2, label: "Po zakończonej produkcji" },
];

// badge statusu (Twoje wymagania)
const statusBadge = (rawStatus) => {
  const n = Number(rawStatus);
  if (Number.isNaN(n)) return { text: "-", cls: "bg-white/10 text-white" };
  if (n === 2) return { text: "✓", cls: "bg-green-500/30 text-green-200" }; // zamknięty
  if (n === 1) return { text: "…", cls: "bg-yellow-500/30 text-yellow-100" }; // w trakcie
  if (n === 3) return { text: "X", cls: "bg-red-500/30 text-red-200" }; // odrzucony
  return { text: "X", cls: "bg-red-500/30 text-red-200" }; // otwarty
};

const timeLabel = (raw) => {
  const n = Number(raw);
  const found = TIME_OPTIONS.find((x) => x.value === n);
  return found?.label ?? (raw == null ? "-" : String(raw));
};

// URL do podglądu zdjęć z backendu
const normalizeMediaUrl = (API_BASE, value) => {
  if (!value) return "";
  const s = String(value);

  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/media/")) {
    try {
      const apiUrl = new URL(API_BASE);
      return `${apiUrl.origin}${s}`;
    } catch {
      return s;
    }
  }
  // jeśli backend zwróci np. "media/tpm/xxx.jpg" bez leading slash
  if (s.startsWith("media/")) {
    return `${API_BASE}/${s}`;
  }
  // fallback
  return `${API_BASE}/${s.replace(/^\//, "")}`;
};

const getUsernameFromSession = () => {
  if (typeof window === "undefined") return "";
  const user = getCurrentUser();
  return user?.sub ?? user?.username ?? localStorage.getItem("username") ?? "";
};

export default function MouldDetails_Tpm({
  API_BASE,
  mouldId,
  mouldNumber,
  mouldProduct,
  logged,
  isAdmin, // admin/superadmin => true
  authHeaders, // () => ({ Authorization: `Bearer ...` })
  initialOpenGuideId,
}) {
  const [tpms, setTpms] = useState([]);
  const [loadingTpms, setLoadingTpms] = useState(false);
  const [tpmError, setTpmError] = useState(null);

  // show 10 / show all
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [mouldNumber]);

  // --- ADD modal ---
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addDraft, setAddDraft] = useState({
    opis_zgloszenia: "",
    tpm_time_type: "0",
    status: "0",
    created: todayISO(),
  });

  const [addPhoto1, setAddPhoto1] = useState(null);
  const [addPhoto2, setAddPhoto2] = useState(null);
  const [addPreview1, setAddPreview1] = useState("");
  const [addPreview2, setAddPreview2] = useState("");

  // --- EDIT modal ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    opis_zgloszenia: "",
    tpm_time_type: "0",
    status: "0",
    created: todayISO(),
  });

  const [editPhoto1, setEditPhoto1] = useState(null);
  const [editPhoto2, setEditPhoto2] = useState(null);
  const [editPreview1, setEditPreview1] = useState("");
  const [editPreview2, setEditPreview2] = useState("");

  // --- DELETE ---
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [tpmSort, setTpmSort] = useState({ key: "id", direction: "desc" });

  const [guides, setGuides] = useState([]);
  const [guideError, setGuideError] = useState(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideSaving, setGuideSaving] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [openedInitialGuideId, setOpenedInitialGuideId] = useState(null);
  const [editingStepId, setEditingStepId] = useState(null);
  const [guideDraft, setGuideDraft] = useState({
    guide_number: "",
    product_name: "",
    review_date: todayISO(),
    review_reason: "",
  });
  const [stepDraft, setStepDraft] = useState({
    lp: 1,
    fault: "",
    confirmed_by: "",
    repair: "",
    performed_by: "",
  });
  const [stepPhoto1, setStepPhoto1] = useState(null);
  const [stepPhoto2, setStepPhoto2] = useState(null);

  const refreshTpms = async () => {
    if (!mouldNumber) return;
    const res = await axios.get(`${API_BASE}/tpm/`, { params: { search: mouldNumber } });
    setTpms(normalizeList(res.data));
  };

  const refreshGuides = async () => {
    if (!mouldId) return;
    const res = await axios.get(`${API_BASE}/service-guides/`, { params: { mould_id: mouldId } });
    setGuides(normalizeList(res.data));
  };

  useEffect(() => {
    if (!mouldNumber) return;

    const controller = new AbortController();

    const fetchTpms = async () => {
      try {
        setLoadingTpms(true);
        setTpmError(null);

        const res = await axios.get(`${API_BASE}/tpm/`, {
          params: { search: mouldNumber },
          signal: controller.signal,
        });

        setTpms(normalizeList(res.data));
      } catch (err) {
        if (
          axios.isCancel?.(err) ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        )
          return;

        console.error(err);
        setTpmError("Nie udało się pobrać danych TPM.");
        setTpms([]);
      } finally {
        setLoadingTpms(false);
      }
    };

    fetchTpms();
    return () => controller.abort();
  }, [API_BASE, mouldNumber]);

  useEffect(() => {
    if (!mouldId) return;
    const controller = new AbortController();

    const fetchGuides = async () => {
      try {
        setGuideLoading(true);
        setGuideError(null);
        const res = await axios.get(`${API_BASE}/service-guides/`, {
          params: { mould_id: mouldId },
          signal: controller.signal,
        });
        setGuides(normalizeList(res.data));
      } catch (err) {
        if (
          axios.isCancel?.(err) ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        )
          return;
        console.error(err);
        setGuideError("Nie udało się pobrać przewodników.");
        setGuides([]);
      } finally {
        setGuideLoading(false);
      }
    };

    fetchGuides();
    return () => controller.abort();
  }, [API_BASE, mouldId]);

  const toggleTpmSort = (key) => {
    setTpmSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const tpmSortIcon = (key) => {
    if (tpmSort.key !== key) return "⇅";
    return tpmSort.direction === "asc" ? "▲" : "▼";
  };

  const sortedTpms = useMemo(() => {
    const direction = tpmSort.direction === "asc" ? 1 : -1;

    return [...tpms].sort((a, b) => {
      const aStatus = Number(a?.status ?? a?.state ?? a?.status_code);
      const bStatus = Number(b?.status ?? b?.state ?? b?.status_code);

      const aClosed = aStatus === 2;
      const bClosed = bStatus === 2;
      if (aClosed !== bClosed) return aClosed ? 1 : -1;

      if (tpmSort.key === "created") {
        const aDate = toSortableDate(pickFirst(a, ["created", "created_at", "timestamp"], null));
        const bDate = toSortableDate(pickFirst(b, ["created", "created_at", "timestamp"], null));
        if (aDate !== bDate) return (aDate - bDate) * direction;
      }

      if (tpmSort.key === "changed") {
        const aDate = toSortableDate(pickFirst(a, ["changed", "updated", "updated_at", "modified", "modified_at"], null));
        const bDate = toSortableDate(pickFirst(b, ["changed", "updated", "updated_at", "modified", "modified_at"], null));
        if (aDate !== bDate) return (aDate - bDate) * direction;
      }

      const aId = Number(pickFirst(a, ["id", "pk", "tpm_id"], 0)) || 0;
      const bId = Number(pickFirst(b, ["id", "pk", "tpm_id"], 0)) || 0;
      return (aId - bId) * direction;
    });
  }, [tpms, tpmSort]);

  const visibleTpms = showAll ? sortedTpms : sortedTpms.slice(0, 10);

  const sortedGuides = useMemo(() => {
    return [...guides].sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return Number(b.id ?? 0) - Number(a.id ?? 0);
    });
  }, [guides]);

  const openGuideAdd = () => {
    if (!isAdmin || !logged) return;
    setGuideError(null);
    setSelectedGuide(null);
    setGuideDraft({
      guide_number: mouldNumber ? `${mouldNumber}-${String(guides.length + 1).padStart(2, "0")}` : "",
      product_name: mouldProduct || "",
      review_date: todayISO(),
      review_reason: "",
    });
    setStepDraft({ lp: 1, fault: "", confirmed_by: "", repair: "", performed_by: "" });
    setStepPhoto1(null);
    setStepPhoto2(null);
    setIsGuideOpen(true);
  };

  const openGuideDetails = (guide) => {
    setSelectedGuide(guide);
    setGuideDraft({
      guide_number: guide.guide_number || "",
      product_name: guide.product_name || "",
      review_date: String(guide.review_date || todayISO()).slice(0, 10),
      review_reason: guide.review_reason || "",
    });
    setStepDraft({
      lp: (guide.steps?.length || 0) + 1,
      fault: "",
      confirmed_by: "",
      repair: "",
      performed_by: "",
    });
    setStepPhoto1(null);
    setStepPhoto2(null);
    setIsGuideOpen(true);
  };

  useEffect(() => {
    if (!initialOpenGuideId || openedInitialGuideId === initialOpenGuideId) return;
    const guide = guides.find((item) => String(item?.id) === String(initialOpenGuideId));
    if (!guide) return;
    openGuideDetails(guide);
    setOpenedInitialGuideId(initialOpenGuideId);
  }, [guides, initialOpenGuideId, openedInitialGuideId]);

  const saveGuide = async () => {
    if (!isAdmin || !logged) return;
    if (!guideDraft.guide_number.trim()) {
      setGuideError("Podaj numer przewodnika.");
      return;
    }
    try {
      setGuideSaving(true);
      setGuideError(null);
      const payload = {
        mould_id: mouldId,
        guide_number: guideDraft.guide_number.trim(),
        product_name: guideDraft.product_name ?? "",
        review_date: guideDraft.review_date || null,
        review_reason: guideDraft.review_reason ?? "",
      };
      const res = selectedGuide?.id
        ? await axios.put(`${API_BASE}/service-guides/${selectedGuide.id}`, payload, {
            headers: { ...(authHeaders?.() ?? {}) },
          })
        : await axios.post(`${API_BASE}/service-guides/`, payload, {
            headers: { ...(authHeaders?.() ?? {}) },
          });

      setSelectedGuide(res.data);
      setGuides((prev) => {
        const exists = prev.some((item) => String(item.id) === String(res.data.id));
        return exists ? prev.map((item) => (item.id === res.data.id ? res.data : item)) : [res.data, ...prev];
      });
      await refreshGuides();
    } catch (err) {
      console.error(err);
      const detail = err?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item?.msg || JSON.stringify(item)).join("; ")
        : detail || "Nie udało się zapisać przewodnika.";
      setGuideError(String(message));
    } finally {
      setGuideSaving(false);
    }
  };

  const closeGuide = () => {
    setIsGuideOpen(false);
    setSelectedGuide(null);
    setGuideError(null);
    setEditingStepId(null);
  };

  const updateGuideStatus = async (guide, action) => {
    try {
      setGuideError(null);
      const res = await axios.put(`${API_BASE}/service-guides/${guide.id}/${action}`, null, {
        headers: { ...(authHeaders?.() ?? {}) },
      });
      setGuides((prev) => prev.map((item) => (item.id === res.data.id ? res.data : item)));
      if (selectedGuide?.id === res.data.id) {
        setSelectedGuide(res.data);
      }
      await refreshGuides();
    } catch (err) {
      console.error(err);
      setGuideError(String(err?.response?.data?.detail || "Nie udało się zmienić statusu przewodnika."));
    }
  };

  const deleteGuide = async (guide) => {
    if (!isAdmin || !logged) return;
    if (!window.confirm(`Usunąć przewodnik ${guide.guide_number}?`)) return;
    await axios.delete(`${API_BASE}/service-guides/${guide.id}`, {
      headers: { ...(authHeaders?.() ?? {}) },
    });
    await refreshGuides();
  };

  const handlePrintServiceGuide = async (guide) => {
    if (!guide?.id) return;

    try {
      setGuideError(null);
      const res = await axios.get(`${API_BASE}/service-guides/${guide.id}`, {
        headers: { ...(authHeaders?.() ?? {}) },
      });
      const fullGuide = res.data || guide;
      const steps = [...(fullGuide.steps || [])].sort((a, b) => Number(a.lp) - Number(b.lp));
      const statusLabel = fullGuide.status === "done" ? "Wykonano" : "Otwarty";
      const photoCell = (photo) => {
        const url = normalizeMediaUrl(API_BASE, photo);
        return url
          ? `<img class="step-photo" src="${escapeHtml(url)}" alt="Zdjecie czynnosci">`
          : `<span class="empty-photo">-</span>`;
      };
      const rows = steps.length
        ? steps.map((step) => `
          <tr>
            <td class="lp">${escapeHtml(step.lp)}</td>
            <td class="repair">${escapeHtml(step.repair || "-").replace(/\n/g, "<br>")}</td>
            <td class="photo">${photoCell(step.extra_photo_1)}</td>
            <td class="photo">${photoCell(step.extra_photo_2)}</td>
            <td class="done">${step.is_done ? `<strong>wykonano</strong><br>${escapeHtml(step.performed_by || "-")}` : "-"}</td>
          </tr>
        `).join("")
        : `<tr><td colspan="5" class="empty-row">Brak czynnosci.</td></tr>`;

      const html = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Przewodnik serwisowania - ${escapeHtml(fullGuide.guide_number || "")}</title>
  <style>
    *{box-sizing:border-box}html,body{margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;background:#e7e5df;color:#111;padding:8px 0 18px}
    .sheet{width:277mm;min-height:190mm;margin:8px auto;padding:8mm;background:#fff;border:1px solid #111;box-shadow:0 1px 6px rgba(0,0,0,.12)}
    .header{text-align:center;border-bottom:2px solid #111;padding-bottom:4mm;margin-bottom:4mm}
    h1{margin:0;font-size:20px;letter-spacing:.3px;text-transform:uppercase}
    .meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #111;border-bottom:none;margin-bottom:6mm}
    .field{border-right:1px solid #111;border-bottom:1px solid #111;padding:2mm;min-height:13mm}
    .field:nth-child(4n){border-right:none}.field-wide{grid-column:span 2}
    .label{font-size:10px;text-transform:uppercase;font-weight:700;margin-bottom:1mm}
    .value{font-size:13px;line-height:1.25;white-space:pre-wrap}
    table{width:100%;border-collapse:collapse;table-layout:fixed}
    th,td{border:1px solid #111;padding:2mm;vertical-align:top;font-size:12px;line-height:1.25}
    th{background:#f2f2f2;text-transform:uppercase;text-align:center;font-size:11px}
    .lp{text-align:center;font-weight:700}.repair{white-space:pre-wrap}.photo{text-align:center;vertical-align:middle}.done{text-align:center}
    .step-photo{display:block;max-width:65mm;max-height:50mm;object-fit:contain;margin:0 auto}.empty-photo{color:#555}
    .empty-row{text-align:center;color:#555;padding:8mm}
    .toolbar{width:277mm;margin:12px auto 4px;display:flex;gap:8px}
    .btn{appearance:none;border:2px solid #111;background:#fff;color:#111;padding:8px 12px;cursor:pointer;font-weight:700}
    .btn:hover{background:#f3f3f3}
    @page{size:A4 landscape;margin:10mm}
    @media print{body{background:#fff;padding:0}.sheet{width:auto;min-height:auto;margin:0;padding:0;border:none;box-shadow:none}.toolbar{display:none}tr{break-inside:avoid;page-break-inside:avoid}.step-photo{max-width:65mm;max-height:50mm}}
    @media screen and (max-width:1150px){.sheet,.toolbar{width:calc(100vw - 16px)}.meta{grid-template-columns:repeat(2,minmax(0,1fr))}.field:nth-child(4n){border-right:1px solid #111}.field:nth-child(2n){border-right:none}.field-wide{grid-column:span 2}}
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header"><h1>Przewodnik serwisowania</h1></div>
    <div class="meta">
      <div class="field"><div class="label">Nr przewodnika</div><div class="value">${escapeHtml(fullGuide.guide_number || "-")}</div></div>
      <div class="field"><div class="label">Nazwa wyrobu</div><div class="value">${escapeHtml(fullGuide.product_name || "-")}</div></div>
      <div class="field"><div class="label">Data przegladu</div><div class="value">${escapeHtml(formatDateOnly(fullGuide.review_date))}</div></div>
      <div class="field"><div class="label">Status</div><div class="value">${escapeHtml(statusLabel)}</div></div>
      <div class="field field-wide"><div class="label">Przyczyna przegladu</div><div class="value">${escapeHtml(fullGuide.review_reason || "-")}</div></div>
      <div class="field field-wide"><div class="label">Forma</div><div class="value">${escapeHtml(mouldNumber || "-")}</div></div>
    </div>
    <table>
      <colgroup><col style="width:12mm"><col><col style="width:70mm"><col style="width:70mm"><col style="width:40mm"></colgroup>
      <thead><tr><th>L.P.</th><th>Naprawa</th><th>Foto 1</th><th>Foto 2</th><th>Wykonano / przez kogo</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="toolbar"><button class="btn" onclick="window.print()">Drukuj</button></div>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        setGuideError("Przegladarka zablokowala nowe okno z wydrukiem.");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      console.error(err);
      setGuideError(String(err?.response?.data?.detail || "Nie udalo sie wygenerowac przewodnika PDF."));
    }
  };

  const addGuideStep = async () => {
    const guide = selectedGuide;
    if (!guide?.id) {
      setGuideError("Najpierw zapisz przewodnik.");
      return;
    }
    const fd = new FormData();
    fd.append("lp", String(Number(stepDraft.lp) || 1));
    fd.append("fault", stepDraft.fault ?? "");
    fd.append("confirmed_by", stepDraft.confirmed_by ?? "");
    fd.append("repair", stepDraft.repair ?? "");
    fd.append("performed_by", stepDraft.performed_by ?? "");
    fd.append("is_done", "false");
    if (stepPhoto1) fd.append("extra_photo_1", stepPhoto1);
    if (stepPhoto2) fd.append("extra_photo_2", stepPhoto2);

    await axios.post(`${API_BASE}/service-guides/${guide.id}/steps`, fd, {
      headers: { ...(authHeaders?.() ?? {}) },
    });
    const res = await axios.get(`${API_BASE}/service-guides/${guide.id}`);
    setSelectedGuide(res.data);
    await refreshGuides();
    setStepDraft({ lp: (res.data.steps?.length || 0) + 1, fault: "", confirmed_by: "", repair: "", performed_by: "" });
    setStepPhoto1(null);
    setStepPhoto2(null);
  };

  const startEditStep = (step) => {
    setEditingStepId(step.id);
    setStepDraft({
      lp: step.lp,
      fault: step.fault || "",
      confirmed_by: step.confirmed_by || "",
      repair: step.repair || "",
      performed_by: step.performed_by || "",
    });
    setStepPhoto1(null);
    setStepPhoto2(null);
  };

  const cancelEditStep = () => {
    setEditingStepId(null);
    setStepDraft({
      lp: (selectedGuide?.steps?.length || 0) + 1,
      fault: "",
      confirmed_by: "",
      repair: "",
      performed_by: "",
    });
    setStepPhoto1(null);
    setStepPhoto2(null);
  };

  const saveGuideStepEdit = async () => {
    const guide = selectedGuide;
    if (!guide?.id || !editingStepId) return;

    try {
      setGuideSaving(true);
      setGuideError(null);

      const fd = new FormData();
      fd.append("lp", String(Number(stepDraft.lp) || 1));
      fd.append("repair", stepDraft.repair ?? "");
      if (stepPhoto1) fd.append("extra_photo_1", stepPhoto1);
      if (stepPhoto2) fd.append("extra_photo_2", stepPhoto2);

      await axios.put(`${API_BASE}/service-guides/${guide.id}/steps/${editingStepId}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(authHeaders?.() ?? {}),
        },
      });

      const res = await axios.get(`${API_BASE}/service-guides/${guide.id}`);
      setSelectedGuide(res.data);
      await refreshGuides();
      cancelEditStep();
    } catch (err) {
      console.error(err);
      setGuideError(String(err?.response?.data?.detail || "Nie udało się zapisać zmian w czynności."));
    } finally {
      setGuideSaving(false);
    }
  };

  const deleteGuideStep = async (step) => {
    const guide = selectedGuide;
    if (!guide?.id || !step?.id) return;
    if (!window.confirm("Usunąć czynność z przewodnika?")) return;
    await axios.delete(`${API_BASE}/service-guides/${guide.id}/steps/${step.id}`, {
      headers: { ...(authHeaders?.() ?? {}) },
    });
    const res = await axios.get(`${API_BASE}/service-guides/${guide.id}`);
    setSelectedGuide(res.data);
    await refreshGuides();
  };

  const toggleGuideStepDone = async (step, isDone) => {
    const guide = selectedGuide;
    if (!guide?.id || !step?.id) return;
    const acceptedBy = getUsernameFromSession();
    await axios.put(
      `${API_BASE}/service-guides/${guide.id}/steps/${step.id}`,
      {
        is_done: isDone,
        performed_by: isDone ? acceptedBy || "zaakceptowano" : "",
      },
      { headers: { ...(authHeaders?.() ?? {}) } }
    );
    const res = await axios.get(`${API_BASE}/service-guides/${guide.id}`);
    setSelectedGuide(res.data);
    await refreshGuides();
  };

  // --- ADD ---
  const openAdd = () => {
    if (!isAdmin || !logged) return;

    setAddError(null);
    setAddDraft({
      opis_zgloszenia: "",
      tpm_time_type: "0",
      status: "0",
      created: todayISO(),
    });

    // reset zdjęć
    if (addPreview1?.startsWith("blob:")) URL.revokeObjectURL(addPreview1);
    if (addPreview2?.startsWith("blob:")) URL.revokeObjectURL(addPreview2);
    setAddPhoto1(null);
    setAddPhoto2(null);
    setAddPreview1("");
    setAddPreview2("");

    setIsAddOpen(true);
  };

  const closeAdd = () => {
    if (savingAdd) return;

    if (addPreview1?.startsWith("blob:")) URL.revokeObjectURL(addPreview1);
    if (addPreview2?.startsWith("blob:")) URL.revokeObjectURL(addPreview2);
    setAddPreview1("");
    setAddPreview2("");
    setAddPhoto1(null);
    setAddPhoto2(null);

    setIsAddOpen(false);
    setAddError(null);
  };

  const saveAdd = async () => {
    if (!isAdmin || !logged) return;

    if (!mouldId) {
      setAddError("Brak mould_id (mouldData.id).");
      return;
    }

    try {
      setSavingAdd(true);
      setAddError(null);

      const fd = new FormData();
      fd.append("mould_id", String(mouldId));
      fd.append("opis_zgloszenia", addDraft.opis_zgloszenia ?? "");
      fd.append("tpm_time_type", String(parseInt(addDraft.tpm_time_type || "0", 10) || 0));
      fd.append("status", String(parseInt(addDraft.status || "0", 10) || 0));
      const createdValue = String(addDraft.created || "").trim() || todayISO();
      fd.append("created", createdValue);
      fd.append("changed", createdValue);
      const author = getUsernameFromSession();
      if (author) fd.append("author", author);

      // ✅ zdjęcia
      if (addPhoto1) fd.append("extra_photo_1", addPhoto1);
      if (addPhoto2) fd.append("extra_photo_2", addPhoto2);

      await axios.post(`${API_BASE}/tpm/`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(authHeaders?.() ?? {}),
        },
      });

      await refreshTpms();
      closeAdd();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się dodać wpisu TPM.";
      setAddError(String(msg));
    } finally {
      setSavingAdd(false);
    }
  };

  // --- EDIT ---
  const openEdit = (row) => {
    if (!isAdmin || !logged) return;

    const id = row?.id ?? row?.tpm_id ?? row?.pk;
    if (!id) return;

    setEditError(null);
    setEditId(id);

    const rowCreated = pickFirst(row, ["created", "created_at", "timestamp"], "");
    const rowCreatedValue = rowCreated ? String(rowCreated).slice(0, 10) : "";

    setEditDraft({
      opis_zgloszenia: row?.opis_zgloszenia ?? "",
      tpm_time_type: String(row?.tpm_time_type ?? 0),
      status: String(row?.status ?? 0),
      created: rowCreatedValue || todayISO(),
    });

    // reset uploadów
    setEditPhoto1(null);
    setEditPhoto2(null);

    // podgląd z backendu (jeśli istnieje)
    const p1 = normalizeMediaUrl(API_BASE, row?.extra_photo_1);
    const p2 = normalizeMediaUrl(API_BASE, row?.extra_photo_2);

    if (editPreview1?.startsWith("blob:")) URL.revokeObjectURL(editPreview1);
    if (editPreview2?.startsWith("blob:")) URL.revokeObjectURL(editPreview2);

    setEditPreview1(p1 || "");
    setEditPreview2(p2 || "");

    setIsEditOpen(true);
  };

  const closeEdit = () => {
    if (savingEdit) return;

    if (editPreview1?.startsWith("blob:")) URL.revokeObjectURL(editPreview1);
    if (editPreview2?.startsWith("blob:")) URL.revokeObjectURL(editPreview2);

    setEditPreview1("");
    setEditPreview2("");
    setEditPhoto1(null);
    setEditPhoto2(null);

    setIsEditOpen(false);
    setEditError(null);
    setEditId(null);
  };

  const saveEdit = async () => {
    if (!isAdmin || !logged) return;
    if (!editId) return;

    try {
      setSavingEdit(true);
      setEditError(null);

      const fd = new FormData();
      fd.append("opis_zgloszenia", editDraft.opis_zgloszenia ?? "");
      fd.append("tpm_time_type", String(parseInt(editDraft.tpm_time_type || "0", 10) || 0));
      fd.append("status", String(parseInt(editDraft.status || "0", 10) || 0));
      const createdValue = String(editDraft.created || "").trim();
      if (createdValue) {
        fd.append("created", createdValue);
      }
      fd.append("changed", todayISO());

      // ✅ zdjęcia (jeśli wybrane)
      if (editPhoto1) fd.append("extra_photo_1", editPhoto1);
      if (editPhoto2) fd.append("extra_photo_2", editPhoto2);

      await axios.put(`${API_BASE}/tpm/${editId}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(authHeaders?.() ?? {}),
        },
      });

      await refreshTpms();
      closeEdit();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się zapisać edycji wpisu TPM.";
      setEditError(String(msg));
    } finally {
      setSavingEdit(false);
    }
  };

  // --- DELETE ---
  const deleteTpm = async (row) => {
    if (!isAdmin || !logged) return;

    const id = row?.id ?? row?.tpm_id ?? row?.pk;
    if (!id) return;

    setDeleteError(null);

    const ok = window.confirm(`Usunąć wpis TPM (ID: ${id})?`);
    if (!ok) return;

    try {
      setDeletingId(id);

      await axios.delete(`${API_BASE}/tpm/${id}`, {
        headers: { ...(authHeaders?.() ?? {}) },
      });

      setTpms((prev) => prev.filter((x) => (x?.id ?? x?.tpm_id ?? x?.pk) !== id));
      await refreshTpms();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się usunąć wpisu TPM.";
      setDeleteError(String(msg));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="mt-12 grid grid-cols-1 xl:grid-cols-[minmax(0,1.9fr)_minmax(360px,0.8fr)] gap-5">
      <div className="border rounded-xl border-blue-500 p-4">
        <section className="text-white">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-3xl text-cyan-400 font-bold">Zgłoszenia TPM:</h2>

            {isAdmin && logged && (
              <button
                type="button"
                onClick={openAdd}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
                title="Dodaj wpis TPM"
                aria-label="Dodaj wpis TPM"
              >
                ＋
              </button>
            )}
          </div>

          {loadingTpms && <p>Ładowanie danych…</p>}
          {tpmError && <p className="text-red-400">{tpmError}</p>}
          {deleteError && <p className="text-red-400">{deleteError}</p>}

          {!loadingTpms && !tpmError && sortedTpms.length === 0 && (
            <p className="opacity-80">Brak wyników TPM dla tej formy.</p>
          )}

          {!loadingTpms && !tpmError && sortedTpms.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-center px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => toggleTpmSort("id")}
                          className="inline-flex items-center justify-center gap-1 hover:text-cyan-300"
                          title="Sortuj po ID"
                        >
                          ID <span className="text-xs">{tpmSortIcon("id")}</span>
                        </button>
                      </th>
                      <th className="text-center px-4 py-3 font-semibold">Opis zgłoszenia</th>
                      <th className="text-center px-4 py-3 font-semibold">Czas reakcji</th>
                      <th className="text-center px-4 py-3 font-semibold">Status</th>
                      <th className="text-center px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => toggleTpmSort("created")}
                          className="inline-flex items-center justify-center gap-1 hover:text-cyan-300"
                          title="Sortuj po dacie utworzenia"
                        >
                          Utworzono <span className="text-xs">{tpmSortIcon("created")}</span>
                        </button>
                      </th>
                      <th className="text-center px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => toggleTpmSort("changed")}
                          className="inline-flex items-center justify-center gap-1 hover:text-cyan-300"
                          title="Sortuj po dacie zmiany"
                        >
                          Zmieniono <span className="text-xs">{tpmSortIcon("changed")}</span>
                        </button>
                      </th>
                      <th className="text-center px-4 py-3 font-semibold">Foto 1</th>
                      <th className="text-center px-4 py-3 font-semibold">Foto 2</th>

                      {isAdmin && logged && (
                        <th className="text-center px-4 py-3 font-semibold">Akcje</th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="text-center">
                    {visibleTpms.map((m, index) => {
                      const id = pickFirst(m, ["id", "pk", "tpm_id"], index + 1);

                      const opis = pickFirst(
                        m,
                        ["opis_zgloszenia", "opis", "description", "title", "subject", "note"],
                        ""
                      );

                      const status = pickFirst(m, ["status", "state", "status_code"], null);
                      const badge = statusBadge(status);

                      const trt = pickFirst(m, ["tpm_time_type", "czas_reakcji", "time_type"], null);
                      const created = pickFirst(m, ["created", "created_at", "timestamp"], null);
                      const updated = pickFirst(
                        m,
                        ["changed", "updated", "updated_at", "modified", "modified_at"],
                        null
                      );
                      const photo1 = normalizeMediaUrl(API_BASE, m?.extra_photo_1);
                      const photo2 = normalizeMediaUrl(API_BASE, m?.extra_photo_2);

                      const isDeletingThis =
                        deletingId !== null && String(deletingId) === String(id);

                      return (
                        <tr key={String(id)} className="border-t border-white/10 hover:bg-white/5">
                          <td className="px-4 py-3 align-middle whitespace-nowrap">{String(id)}</td>

                          <td className="px-4 py-3 align-middle">
                            <div className="whitespace-pre-wrap break-words text-center">
                              {opis || "-"}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            {timeLabel(trt)}
                          </td>

                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center w-10 h-8 rounded-lg font-bold ${badge.cls}`}
                              title={
                                STATUS_OPTIONS.find((o) => o.value === Number(status))?.label ?? ""
                              }
                            >
                              {badge.text}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            {formatDateOnly(created)}
                          </td>

                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            {formatDateOnly(updated)}
                          </td>

                          <td className="px-4 py-3 align-middle">
                            <div className="flex justify-center">
                              {photo1 ? (
                                <a href={photo1} target="_blank" rel="noreferrer">
                                  <img
                                    src={photo1}
                                    alt="TPM foto 1"
                                    className="w-12 h-12 object-cover rounded-lg border border-white/10"
                                  />
                                </a>
                              ) : (
                                <span className="opacity-60">-</span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-middle">
                            <div className="flex justify-center">
                              {photo2 ? (
                                <a href={photo2} target="_blank" rel="noreferrer">
                                  <img
                                    src={photo2}
                                    alt="TPM foto 2"
                                    className="w-12 h-12 object-cover rounded-lg border border-white/10"
                                  />
                                </a>
                              ) : (
                                <span className="opacity-60">-</span>
                              )}
                            </div>
                          </td>

                          {isAdmin && logged && (
                            <td className="px-4 py-3 align-middle whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                                  title="Edytuj wpis"
                                  aria-label="Edytuj wpis"
                                  onClick={() => openEdit(m)}
                                >
                                  ✎
                                </button>

                                <button
                                  type="button"
                                  className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 disabled:opacity-50"
                                  title="Usuń wpis"
                                  aria-label="Usuń wpis"
                                  onClick={() => deleteTpm(m)}
                                  disabled={isDeletingThis}
                                >
                                  {isDeletingThis ? "…" : "🗑️"}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {sortedTpms.length > 10 && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
                    onClick={() => setShowAll((p) => !p)}
                  >
                    {showAll ? "Pokaż mniej" : `Pokaż wszystkie (${sortedTpms.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="border rounded-xl border-blue-500 p-4 text-white">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-3xl text-cyan-400 font-bold">Przewodniki:</h2>
          {isAdmin && logged && (
            <button
              type="button"
              onClick={openGuideAdd}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold"
              title="Dodaj nowy przewodnik"
            >
              Dodaj nowy
            </button>
          )}
        </div>

        {guideLoading && <p>Ładowanie przewodników...</p>}
        {guideError && <p className="text-red-400">{guideError}</p>}

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-center px-4 py-3 font-semibold">Przewodnik</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-center px-4 py-3 font-semibold">PDF</th>
                {isAdmin && logged && <th className="text-center px-4 py-3 font-semibold">Akcje</th>}
              </tr>
            </thead>
            <tbody className="text-center">
              {!guideLoading && sortedGuides.length === 0 && (
                <tr>
                  <td colSpan={isAdmin && logged ? 4 : 3} className="px-4 py-6 opacity-80">
                    Brak przewodników dla tej formy.
                  </td>
                </tr>
              )}
              {sortedGuides.map((guide) => (
                <tr key={guide.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openGuideDetails(guide)}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-200 font-semibold"
                      title="Otwórz przewodnik"
                    >
                      {guide.guide_number}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full border text-xs font-semibold ${
                        guide.status === "done"
                          ? "bg-green-500/20 text-green-200 border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-100 border-yellow-500/30"
                      }`}
                    >
                      {guide.status === "done" ? "Wykonano" : "Otwarty"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handlePrintServiceGuide(guide)}
                      className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-semibold"
                      title="Wygeneruj PDF przewodnika"
                    >
                      PDF
                    </button>
                  </td>
                  {isAdmin && logged && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {(() => {
                          const steps = guide.steps || [];
                          const canCompleteGuide = steps.length > 0 && steps.every((step) => step.is_done);
                          return (
                        <button
                          type="button"
                          onClick={() => updateGuideStatus(guide, "complete")}
                          className="px-3 py-2 rounded-lg bg-green-500/30 hover:bg-green-500/40 text-green-100 disabled:opacity-40"
                          disabled={guide.status === "done" || !canCompleteGuide}
                          title={
                            canCompleteGuide
                              ? "Potwierdź wykonanie"
                              : "Najpierw zaakceptuj wszystkie czynności w przewodniku"
                          }
                        >
                          ✓
                        </button>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => updateGuideStatus(guide, "reopen")}
                          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40"
                          disabled={guide.status !== "done"}
                          title="Ponownie otwórz"
                        >
                          ↺
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGuide(guide)}
                          className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200"
                          title="Usuń"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {isAdmin && logged && isGuideOpen && (
        <div
          className="fixed bottom-0 right-0 top-0 left-0 md:left-[88px] z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeGuide();
          }}
        >
          <div className="w-full max-w-6xl max-h-[88vh] rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-4 sm:p-5 text-white flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-cyan-400">
                {selectedGuide ? "Przewodnik serwisowania" : "Nowy przewodnik serwisowania"}
              </h3>
              {selectedGuide && (
                <button
                  type="button"
                  onClick={() => handlePrintServiceGuide(selectedGuide)}
                  className="ml-auto mr-2 px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-semibold"
                  title="Wygeneruj PDF przewodnika"
                >
                  PDF
                </button>
              )}
              <button type="button" onClick={closeGuide} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20">
                ✕
              </button>
            </div>

            {guideError && <div className="mb-3 text-red-400 text-sm">{guideError}</div>}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-sm opacity-80 mb-1">Nr przewodnika</label>
                  <input
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={guideDraft.guide_number}
                    onChange={(e) => setGuideDraft((p) => ({ ...p, guide_number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm opacity-80 mb-1">Nazwa wyrobu</label>
                  <input
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={guideDraft.product_name}
                    onChange={(e) => setGuideDraft((p) => ({ ...p, product_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm opacity-80 mb-1">Data przeglądu</label>
                  <input
                    type="date"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={guideDraft.review_date}
                    onChange={(e) => setGuideDraft((p) => ({ ...p, review_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm opacity-80 mb-1">Przyczyna przeglądu</label>
                  <input
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={guideDraft.review_reason}
                    onChange={(e) => setGuideDraft((p) => ({ ...p, review_reason: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={saveGuide}
                  disabled={guideSaving}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold disabled:opacity-50"
                >
                  {guideSaving ? "Zapisuję..." : selectedGuide ? "Zapisz przewodnik" : "Utwórz przewodnik"}
                </button>
              </div>

              {selectedGuide && (
                <>
                  {editingStepId ? (
                    <div className="border border-cyan-500/30 p-3 rounded-xl bg-cyan-500/5 mb-3">
                      <div className="text-sm font-semibold text-cyan-400 mb-2">
                        Edycja czynności L.P. {stepDraft.lp}
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-[64px_minmax(0,1fr)_auto] gap-3 items-stretch">
                        <input
                          type="number"
                          min="1"
                          className="h-12 rounded-xl px-3 bg-white/5 border border-white/10 text-white"
                          value={stepDraft.lp}
                          onChange={(e) => setStepDraft((p) => ({ ...p, lp: e.target.value }))}
                        />
                        <input
                          className="h-12 rounded-xl px-3 bg-white/5 border border-white/10 text-white"
                          placeholder="Naprawa"
                          value={stepDraft.repair}
                          onChange={(e) => setStepDraft((p) => ({ ...p, repair: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={saveGuideStepEdit}
                            className="h-12 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                          >
                            Zapisz zmiany
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditStep}
                            className="h-12 px-4 rounded-lg bg-white/10 hover:bg-white/20 font-semibold"
                          >
                            Anuluj
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[64px_minmax(0,1fr)_auto] gap-3 mb-3 items-stretch">
                      <input
                        type="number"
                        min="1"
                        className="h-12 rounded-xl px-3 bg-white/5 border border-white/10 text-white"
                        value={stepDraft.lp}
                        onChange={(e) => setStepDraft((p) => ({ ...p, lp: e.target.value }))}
                      />
                      <input
                        className="h-12 rounded-xl px-3 bg-white/5 border border-white/10 text-white"
                        placeholder="Naprawa"
                        value={stepDraft.repair}
                        onChange={(e) => setStepDraft((p) => ({ ...p, repair: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={addGuideStep}
                        className="h-12 px-4 rounded-lg bg-white/10 hover:bg-white/20 font-semibold"
                      >
                        Dodaj czynność
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <label className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      <span className="block mb-1 opacity-80">
                        {editingStepId ? "Zdjęcie 1 (wybierz nowe, by zmienić)" : "Zdjęcie 1"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => setStepPhoto1(e.target.files?.[0] || null)}
                      />
                      {stepPhoto1 && <span className="mt-1 block text-xs text-cyan-200">{stepPhoto1.name}</span>}
                    </label>
                    <label className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      <span className="block mb-1 opacity-80">
                        {editingStepId ? "Zdjęcie 2 (wybierz nowe, by zmienić)" : "Zdjęcie 2"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => setStepPhoto2(e.target.files?.[0] || null)}
                      />
                      {stepPhoto2 && <span className="mt-1 block text-xs text-cyan-200">{stepPhoto2.name}</span>}
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full min-w-[1080px] text-sm table-fixed">
                      <colgroup>
                        <col className="w-20" />
                        <col className="w-[44%]" />
                        <col className="w-28" />
                        <col className="w-28" />
                        <col className="w-[22%]" />
                        <col className="w-40" />
                      </colgroup>
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-3 py-3">L.P.</th>
                          <th className="px-3 py-3">Naprawa</th>
                          <th className="px-3 py-3">Foto 1</th>
                          <th className="px-3 py-3">Foto 2</th>
                          <th className="px-3 py-3">Wykonał</th>
                          <th className="px-3 py-3">Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedGuide.steps || []).length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-5 text-center opacity-80">
                              Brak czynności.
                            </td>
                          </tr>
                        )}
                        {[...(selectedGuide.steps || [])]
                          .sort((a, b) => Number(a.lp) - Number(b.lp))
                          .map((step) => (
                            <tr
                              key={step.id}
                              className={`border-t border-white/10 align-top ${step.is_done ? "bg-green-500/10" : ""}`}
                            >
                              <td className="px-3 py-3 text-center font-semibold">{step.lp}</td>
                              <td className="px-3 py-3 whitespace-pre-wrap">{step.repair || "-"}</td>
                              <td className="px-3 py-3 text-center">
                                {step.extra_photo_1 ? (
                                  <a
                                    href={normalizeMediaUrl(API_BASE, step.extra_photo_1)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex px-2 py-1 rounded-lg bg-blue-500/20 text-blue-200 hover:bg-blue-500/30"
                                  >
                                    Foto
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {step.extra_photo_2 ? (
                                  <a
                                    href={normalizeMediaUrl(API_BASE, step.extra_photo_2)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex px-2 py-1 rounded-lg bg-blue-500/20 text-blue-200 hover:bg-blue-500/30"
                                  >
                                    Foto
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-3 py-3 whitespace-pre-wrap">
                                {step.is_done ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="inline-flex px-2 py-1 rounded-full bg-green-500/20 text-green-200 text-xs">
                                      wykonano
                                    </span>
                                    <span>{step.performed_by || "-"}</span>
                                  </div>
                                ) : (
                                  step.performed_by || "-"
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleGuideStepDone(step, !step.is_done)}
                                    className={`px-3 py-2 rounded-lg ${
                                      step.is_done
                                        ? "bg-white/10 hover:bg-white/20"
                                        : "bg-green-500/30 hover:bg-green-500/40 text-green-100"
                                    }`}
                                    title={step.is_done ? "Cofnij potwierdzenie" : "Potwierdź wykonanie czynności"}
                                  >
                                    {step.is_done ? "↺" : "✓"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEditStep(step)}
                                    className="px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200"
                                    title="Edytuj czynność"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteGuideStep(step)}
                                    className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200"
                                    title="Usuń czynność"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DODAJ */}
      {isAdmin && logged && isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAdd();
          }}
        >
          <div className="w-full max-w-5xl max-h-[85vh] rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-5 text-white flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-cyan-400">Nowy wpis TPM</h3>
              <button
                type="button"
                onClick={closeAdd}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                disabled={savingAdd}
              >
                ✕
              </button>
            </div>

            {addError && <div className="mb-3 text-red-400 text-sm">{addError}</div>}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LEWA 2/3 */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm opacity-80 mb-1">Opis zgłoszenia</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={addDraft.opis_zgloszenia}
                    onChange={(e) =>
                      setAddDraft((p) => ({ ...p, opis_zgloszenia: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm opacity-80 mb-1">Czas reakcji</label>
                    <select
                      className="w-full rounded-xl p-3 border border-white/10 bg-white text-slate-900"
                      value={addDraft.tpm_time_type}
                      onChange={(e) =>
                        setAddDraft((p) => ({ ...p, tpm_time_type: e.target.value }))
                      }
                    >
                      {TIME_OPTIONS.map((o) => (
                        <option key={o.value} value={String(o.value)}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm opacity-80 mb-1">Status</label>
                    <select
                      className="w-full rounded-xl p-3 border border-white/10 bg-white text-slate-900"
                      value={addDraft.status}
                      onChange={(e) => setAddDraft((p) => ({ ...p, status: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={String(o.value)}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm opacity-80 mb-1">Data utworzenia</label>
                  <input
                    type="date"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={addDraft.created}
                    onChange={(e) => setAddDraft((p) => ({ ...p, created: e.target.value }))}
                  />
                </div>
              </div>

              {/* PRAWA 1/3: zdjęcia */}
              <div className="md:col-span-1">
                <div className="rounded-xl border border-white/10 p-4 bg-slate-800">
                  <div className="font-semibold mb-3">Zdjęcia</div>

                  {/* PHOTO 1 */}
                  <div className="mb-4">
                    <div className="text-sm opacity-80 mb-2">Zdjęcie 1</div>
                    <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                      {addPreview1 ? (
                        <img src={addPreview1} alt="Podgląd 1" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-xs opacity-60">Brak</div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setAddPhoto1(file);

                          if (addPreview1?.startsWith("blob:")) URL.revokeObjectURL(addPreview1);

                          if (file) setAddPreview1(URL.createObjectURL(file));
                          else setAddPreview1("");
                        }}
                      />
                    </div>
                    {addPhoto1 && (
                      <button
                        type="button"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                        onClick={() => {
                          setAddPhoto1(null);
                          if (addPreview1?.startsWith("blob:")) URL.revokeObjectURL(addPreview1);
                          setAddPreview1("");
                        }}
                      >
                        Cofnij wybór
                      </button>
                    )}
                  </div>

                  {/* PHOTO 2 */}
                  <div>
                    <div className="text-sm opacity-80 mb-2">Zdjęcie 2</div>
                    <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                      {addPreview2 ? (
                        <img src={addPreview2} alt="Podgląd 2" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-xs opacity-60">Brak</div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setAddPhoto2(file);

                          if (addPreview2?.startsWith("blob:")) URL.revokeObjectURL(addPreview2);

                          if (file) setAddPreview2(URL.createObjectURL(file));
                          else setAddPreview2("");
                        }}
                      />
                    </div>
                    {addPhoto2 && (
                      <button
                        type="button"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                        onClick={() => {
                          setAddPhoto2(null);
                          if (addPreview2?.startsWith("blob:")) URL.revokeObjectURL(addPreview2);
                          setAddPreview2("");
                        }}
                      >
                        Cofnij wybór
                      </button>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeAdd}
                disabled={savingAdd}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={saveAdd}
                disabled={savingAdd}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
              >
                {savingAdd ? "Zapisuję…" : "Dodaj wpis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDYTUJ */}
      {isAdmin && logged && isEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
        <div className="w-full max-w-5xl max-h-[85vh] rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-5 text-white flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-cyan-400">
                Edycja wpisu TPM (ID: {String(editId)})
              </h3>
              <button
                type="button"
                onClick={closeEdit}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                disabled={savingEdit}
              >
                ✕
              </button>
            </div>

            {editError && <div className="mb-3 text-red-400 text-sm">{editError}</div>}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* LEWA 2/3 */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm opacity-80 mb-1">Opis zgłoszenia</label>
                    <textarea
                      className="w-full min-h-[120px] rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                      value={editDraft.opis_zgloszenia}
                      onChange={(e) =>
                        setEditDraft((p) => ({ ...p, opis_zgloszenia: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm opacity-80 mb-1">Czas reakcji</label>
                      <select
                        className="w-full rounded-xl p-3 border border-white/10 bg-white text-slate-900"
                        value={editDraft.tpm_time_type}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, tpm_time_type: e.target.value }))
                        }
                      >
                        {TIME_OPTIONS.map((o) => (
                          <option key={o.value} value={String(o.value)}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm opacity-80 mb-1">Status</label>
                      <select
                        className="w-full rounded-xl p-3 border border-white/10 bg-white text-slate-900"
                        value={editDraft.status}
                        onChange={(e) => setEditDraft((p) => ({ ...p, status: e.target.value }))}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={String(o.value)}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm opacity-80 mb-1">Data utworzenia</label>
                    <input
                      type="date"
                      className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                      value={editDraft.created}
                      onChange={(e) => setEditDraft((p) => ({ ...p, created: e.target.value }))}
                    />
                  </div>
                </div>

                {/* PRAWA 1/3: zdjęcia */}
                <div className="md:col-span-1">
                  <div className="rounded-xl border border-white/10 p-4 bg-slate-800">
                    <div className="font-semibold mb-3">Zdjęcia</div>

                    {/* PHOTO 1 */}
                    <div className="mb-4">
                      <div className="text-sm opacity-80 mb-2">Zdjęcie 1</div>
                      <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                        {editPreview1 ? (
                          <img
                            src={editPreview1}
                            alt="Podgląd 1"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-xs opacity-60">Brak</div>
                        )}
                      </div>
                      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setEditPhoto1(file);

                            if (editPreview1?.startsWith("blob:")) URL.revokeObjectURL(editPreview1);

                            if (file) setEditPreview1(URL.createObjectURL(file));
                            // jeśli user wyczyści wybór w input (rzadkie) -> wracamy do pustego
                            else setEditPreview1("");
                          }}
                        />
                      </div>
                      {editPhoto1 && (
                        <button
                          type="button"
                          className="mt-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                          onClick={() => {
                            setEditPhoto1(null);
                            if (editPreview1?.startsWith("blob:"))
                              URL.revokeObjectURL(editPreview1);
                            // wróć do zdjęcia z backendu, jeśli było (nie mamy już row, więc zostaw aktualny preview jeśli to url http)
                            setEditPreview1((p) => (p?.startsWith("http") ? p : ""));
                          }}
                        >
                          Cofnij wybór
                        </button>
                      )}
                    </div>

                    {/* PHOTO 2 */}
                    <div>
                      <div className="text-sm opacity-80 mb-2">Zdjęcie 2</div>
                      <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                        {editPreview2 ? (
                          <img
                            src={editPreview2}
                            alt="Podgląd 2"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-xs opacity-60">Brak</div>
                        )}
                      </div>
                      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setEditPhoto2(file);

                            if (editPreview2?.startsWith("blob:"))
                              URL.revokeObjectURL(editPreview2);

                            if (file) setEditPreview2(URL.createObjectURL(file));
                            else setEditPreview2("");
                          }}
                        />
                      </div>
                      {editPhoto2 && (
                        <button
                          type="button"
                          className="mt-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                          onClick={() => {
                            setEditPhoto2(null);
                            if (editPreview2?.startsWith("blob:"))
                              URL.revokeObjectURL(editPreview2);
                            setEditPreview2((p) => (p?.startsWith("http") ? p : ""));
                          }}
                        >
                          Cofnij wybór
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
              >
                {savingEdit ? "Zapisuję…" : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
