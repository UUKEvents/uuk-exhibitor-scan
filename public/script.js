// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW Registration failed:", err));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const exhibitorId = params.get("exhibitor_id");

  // UI elements
  const startButton = document.getElementById("start");
  const torchToggle = document.getElementById("torch-toggle");
  const status = document.getElementById("status");

  // Mandatory Exhibitor ID Check
  if (!exhibitorId) {
    status.textContent = "Error: No Exhibitor ID found. Use a valid link.";
    status.style.color = "var(--uuk-red)";
    startButton.disabled = true;
    return;
  }
  const scannerDiv = document.getElementById("scanner");
  const consentDiv = document.getElementById("consent");
  const consentText = document.getElementById("consent-text");
  const resultDiv = document.getElementById("result");
  const totalScansEl = document.getElementById("total-scans");
  const connectivityStatus = document.getElementById("connectivity-status");
  const offlineTools = document.getElementById("offline-tools");
  const syncNowBtn = document.getElementById("sync-now");
  const exportCsvBtn = document.getElementById("export-csv");
  const starRating = document.getElementById("star-rating");
  const notesField = document.getElementById("notes");

  document.getElementById("exhibitor-name").textContent =
    exhibitorId || "Exhibitor Scan";
  consentText.textContent = `Have you received consent to share these details with exhibitor (ID: ${exhibitorId}) after the event?`;

  // State
  let ticketId = null;
  let html5QrCode = null;
  let scanLocked = false;
  let isTorchOn = false;
  let currentRating = 0;

  // GDPR-compliant Stats Tracking
  function updateTotalScans() {
    const totals = parseInt(localStorage.getItem("uuk_scan_total") || "0");
    totalScansEl.textContent = totals;
  }

  function checkAndResetStats() {
    const today = new Date().toISOString().split("T")[0];
    const lastResetDate = localStorage.getItem("uuk_last_reset_date");
    const lastExhibitorId = localStorage.getItem("uuk_last_exhibitor_id");

    if (lastResetDate !== today || lastExhibitorId !== exhibitorId) {
      localStorage.setItem("uuk_scan_total", "0");
      localStorage.setItem("uuk_last_reset_date", today);
      localStorage.setItem("uuk_last_exhibitor_id", exhibitorId || "");
    }
  }

  // Star Rating Logic
  const stars = starRating.querySelectorAll("span");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      currentRating = parseInt(star.getAttribute("data-value"));
      updateStarUI();
    });
  });

  function updateStarUI() {
    stars.forEach((star) => {
      const val = parseInt(star.getAttribute("data-value"));
      star.classList.toggle("active", val === currentRating);
    });
  }

  checkAndResetStats();
  updateTotalScans();

  function incrementTotalScans() {
    const totals = parseInt(localStorage.getItem("uuk_scan_total") || "0") + 1;
    localStorage.setItem("uuk_scan_total", totals);
    updateTotalScans();
  }

  // Offline Management
  const OFFLINE_QUEUE_KEY = "uuk_scan_queue";

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function addToQueue(payload) {
    const queue = getQueue();
    queue.push(payload);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    updateConnectivityUI();
  }

  function updateConnectivityUI() {
    const queue = getQueue();
    if (navigator.onLine) {
      connectivityStatus.textContent = "Online";
      connectivityStatus.className = "status-indicator online";
      if (queue.length > 0) {
        connectivityStatus.textContent = `Syncing (${queue.length})...`;
        processQueue();
      }
    } else {
      connectivityStatus.textContent = `Offline (${queue.length} pending)`;
      connectivityStatus.className = "status-indicator offline";
    }

    // Show/hide offline tools based on queue
    if (queue.length > 0) {
      offlineTools.hidden = false;
    } else {
      offlineTools.hidden = true;
    }
  }
  let isSyncing = false;
  async function processQueue() {
    if (isSyncing || !navigator.onLine) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    isSyncing = true;
    const payload = queue[0];
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const currentQueue = getQueue();
        currentQueue.shift();
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(currentQueue));
      }
    } catch (e) {
      console.error("Queue sync failed", e);
    } finally {
      isSyncing = false;
      updateConnectivityUI();
    }
  }

  syncNowBtn.addEventListener("click", () => {
    if (!navigator.onLine) {
      alert("Still offline. Please check your connection.");
      return;
    }
    processQueue();
  });

  exportCsvBtn.addEventListener("click", () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    const headers = [
      "Ticket ID",
      "Exhibitor ID",
      "Consent",
      "Rating",
      "Notes",
      "Scanned At",
    ];
    const rows = queue.map((p) => [
      p.ticket_id,
      p.exhibitor_id,
      p.consent,
      p.rating || "0",
      `"${(p.notes || "").replace(/"/g, '""')}"`, // Handle CSV escaping
      p.scanned_at || new Date().toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `uuk_scans_backup_${new Date().getTime()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  window.addEventListener("online", updateConnectivityUI);
  window.addEventListener("offline", updateConnectivityUI);
  updateConnectivityUI();

  // Scanner Logic
  startButton.addEventListener("click", async () => {
    startButton.disabled = true;
    status.textContent = "Starting camera…";

    if (typeof Html5Qrcode === "undefined") {
      alert("QR library failed to load");
      startButton.disabled = false;
      return;
    }

    html5QrCode = new Html5Qrcode("qr-reader");

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess
      );
      status.textContent = "Scanning…";
      // Flashlight support check
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          torchToggle.hidden = false;
        }
      } catch (capErr) {
        console.warn("Flashlight support check failed", capErr);
      }
    } catch (err) {
      status.textContent = "Camera failed";
      startButton.disabled = false;
      alert("Camera failed: " + err.message);
    }
  });

  async function onScanSuccess(decodedText) {
    if (scanLocked) return;
    ticketId = decodedText;
    scanLocked = true;

    // Haptic feedback
    if ("vibrate" in navigator) {
      navigator.vibrate(100);
    }

    try {
      await html5QrCode.stop();
      scannerDiv.hidden = true;
      consentDiv.hidden = false;
      status.textContent = "";
      isTorchOn = false;
      torchToggle.textContent = "🔦";
    } catch (err) {
      console.error("Stop failed", err);
    }
  }

  torchToggle.addEventListener("click", async () => {
    if (!html5QrCode) return;
    isTorchOn = !isTorchOn;
    try {
      await html5QrCode.applyVideoConstraints({
        advanced: [{ torch: isTorchOn }],
      });
      torchToggle.textContent = isTorchOn ? "💡" : "🔦";
    } catch (e) {
      console.error("Flashlight toggle failed", e);
    }
  });

  function resetUI() {
    scanLocked = false;
    ticketId = null;
    resultDiv.hidden = true;
    consentDiv.hidden = true;
    scannerDiv.hidden = false;
    startButton.disabled = false;
    status.textContent = "Camera inactive";
    if (html5QrCode) {
      html5QrCode.clear();
      html5QrCode = null;
    }
    notesField.value = "";
    currentRating = 0;
    updateStarUI();
  }

  async function handleScanSubmission(consent) {
    const payload = {
      ticket_id: ticketId,
      exhibitor_id: exhibitorId,
      consent,
      rating: currentRating,
      notes: notesField.value.trim(),
      scanned_at: new Date().toISOString(),
    };

    // UI feedback for processing
    consentDiv.hidden = true;
    resultDiv.hidden = false;
    resultDiv.textContent = "Processing...";

    incrementTotalScans();

    if (!navigator.onLine) {
      addToQueue(payload);
      resultDiv.textContent = consent
        ? "Saved offline. Thank you."
        : "Declined (saved offline).";
      setTimeout(resetUI, 2000);
      return;
    }

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Server error");

      resultDiv.textContent = consent
        ? "Consent recorded. Thank you."
        : "Consent declined.";
      setTimeout(resetUI, 2000);
    } catch (err) {
      console.warn("Failed to send, queueing offline", err);
      addToQueue(payload);
      resultDiv.textContent = "Saved offline.";
      setTimeout(resetUI, 2000);
    }
  }

  document.getElementById("yes").onclick = () => handleScanSubmission(true);
  document.getElementById("no").onclick = () => handleScanSubmission(false);
});
