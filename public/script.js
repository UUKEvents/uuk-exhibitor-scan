// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW Registration failed:", err));
  });
}

import {
  initTheme,
  toggleTheme,
  updateConnectivityUI,
  vibrate,
} from "./js/utils.js";

initTheme();

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const AUTH_KEY = "uuk_auth_verified_id";
  const NAME_KEY = "uuk_auth_verified_name";

  let exhibitorId =
    params.get("exhibitor_id") || localStorage.getItem(AUTH_KEY);
  let queryPasscode = params.get("passcode");

  // Authentication State
  let isAuthenticated = false;
  let exhibitorName = null;

  // UI elements
  const startButton = document.getElementById("start");
  const torchToggle = document.getElementById("torch-toggle");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const status = document.getElementById("status");
  const changeExhibitorBtn = document.getElementById("change-exhibitor");

  // Auth UI
  const authModal = document.getElementById("auth-modal");
  const authIdInput = document.getElementById("auth-exhibitor-id");
  const authPassInput = document.getElementById("auth-passcode");
  const authSubmitBtn = document.getElementById("auth-submit");
  const authCancelBtn = document.getElementById("auth-cancel");

  // Manual Email UI
  const showManualEmailBtn = document.getElementById("show-manual-email");
  const manualEmailDiv = document.getElementById("manual-email");
  const manualEmailInput = document.getElementById("manual-email-input");
  const manualEmailContinueBtn = document.getElementById(
    "manual-email-continue"
  );
  const manualEmailCancelBtn = document.getElementById("manual-email-cancel");

  // Other UI elements
  const notesField = document.getElementById("notes");
  const scannerDiv = document.getElementById("scanner");
  const consentDiv = document.getElementById("consent");
  const consentText = document.getElementById("consent-text");
  const resultDiv = document.getElementById("result");
  const totalScansEl = document.getElementById("total-scans");
  const connectivityStatus = document.getElementById("connectivity-status");
  const offlineTools = document.getElementById("offline-tools");
  const syncNowBtn = document.getElementById("sync-now");
  const exportCsvBtn = document.getElementById("export-csv");
  const resetDataBtn = document.getElementById("reset-data");
  const starRating = document.getElementById("star-rating");

  function refreshExhibitorUI() {
    if (!exhibitorId || !isAuthenticated) {
      status.textContent = !exhibitorId
        ? "Error: No Exhibitor ID found. Use the tool below to set one."
        : "Pending Authentication...";
      status.style.color = "var(--uuk-red)";
      startButton.disabled = true;
      if (changeExhibitorBtn)
        changeExhibitorBtn.textContent = "Set Exhibitor ID";

      // If we have an ID but not authenticated, show modal
      if (exhibitorId && !isAuthenticated) {
        showAuthModal(exhibitorId);
      }
    } else {
      status.textContent = "Camera inactive";
      status.style.color = "";
      startButton.disabled = false;
      if (changeExhibitorBtn)
        changeExhibitorBtn.textContent = "Change Exhibitor ID";
    }
    document.getElementById("exhibitor-name").textContent =
      exhibitorName || exhibitorId || "Exhibitor Scan";
    consentText.textContent = `Have you received consent to share these details with ${
      exhibitorName || "the exhibitor"
    } (ID: ${exhibitorId || "Unknown"}) after the event?`;
  }

  async function verifyExhibitor(id, passcode) {
    if (!navigator.onLine) {
      // If offline, check against stored ID
      if (localStorage.getItem(AUTH_KEY) === id) {
        isAuthenticated = true;
        exhibitorId = id;
        refreshExhibitorUI();
        return true;
      }
      alert(
        "Authentication requires an internet connection for new or unverified IDs."
      );
      return false;
    }

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exhibitor_id: id, passcode: passcode }),
      });

      if (response.status === 401) {
        alert(
          "Invalid Passcode for Exhibitor ID: " +
            id +
            ". Please double check your credentials."
        );
        return false;
      }

      if (!response.ok) throw new Error("Auth service unavailable");

      const { verified, exhibitor_name } = await response.json();

      if (verified) {
        isAuthenticated = true;
        exhibitorId = id;
        exhibitorName = exhibitor_name;
        localStorage.setItem(AUTH_KEY, id);
        if (exhibitor_name) {
          localStorage.setItem(NAME_KEY, exhibitor_name);
        } else {
          localStorage.removeItem(NAME_KEY);
        }

        const url = new URL(window.location.href);
        url.searchParams.set("exhibitor_id", id);
        window.history.replaceState({}, "", url);

        refreshExhibitorUI();
        return true;
      } else {
        alert("Authentication failed. Please check your credentials.");
        return false;
      }
    } catch (err) {
      console.error("Auth error:", err);
      alert("Error contacting authentication service. Please try again.");
      return false;
    }
  }

  function showAuthModal(presetId = "") {
    authIdInput.value = presetId || exhibitorId || "";
    authPassInput.value = "";
    authModal.hidden = false;
  }

  authSubmitBtn.onclick = async () => {
    const id = authIdInput.value.trim();
    const pass = authPassInput.value.trim();
    if (!id || !pass) {
      alert("Please enter both ID and Passcode");
      return;
    }

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = "Verifying...";

    const success = await verifyExhibitor(id, pass);

    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = "Verify & Save";

    if (success) {
      authModal.hidden = true;
      checkAndResetStats(); // Reset stats if ID changed
    }
  };

  authCancelBtn.onclick = () => {
    if (!isAuthenticated && exhibitorId) {
      // If we have an ID but cancelled auth, we are stuck.
    }
    authModal.hidden = true;
  };

  // Initial Auth Check
  async function initAuth() {
    const storedId = localStorage.getItem(AUTH_KEY);

    if (exhibitorId && queryPasscode) {
      // Manual/Link auth with passcode
      const success = await verifyExhibitor(exhibitorId, queryPasscode);
      if (!success) showAuthModal(exhibitorId);
    } else if (exhibitorId) {
      // If we have an ID (from URL or storage), check if it was previously verified
      if (storedId === exhibitorId) {
        isAuthenticated = true;
        exhibitorName = localStorage.getItem(NAME_KEY);
        refreshExhibitorUI();
      } else {
        // ID present but not verified, show modal
        showAuthModal(exhibitorId);
      }
    } else {
      // No ID at all
      refreshExhibitorUI();
    }
  }

  initAuth();

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
    updateStatus();
  }

  function updateStatus() {
    updateConnectivityUI(getQueue(), connectivityStatus);
    // Show tools if queue exists OR if exhibitorId is missing/being changed
    if (getQueue().length > 0 || !exhibitorId) {
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
      updateStatus();
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

  changeExhibitorBtn.addEventListener("click", async () => {
    const queue = getQueue();
    if (queue.length > 0 && navigator.onLine) {
      const confirmSync = confirm(
        `You have ${queue.length} pending scans. Sync them now before changing ID?`
      );
      if (confirmSync) {
        await processQueue();
      }
    }

    showAuthModal();
  });

  resetDataBtn.addEventListener("click", () => {
    const queue = getQueue();
    if (queue.length > 0 && navigator.onLine) {
      const confirmSync = confirm(
        `You have ${queue.length} pending scans. Sync them now before resetting?`
      );
      if (confirmSync) {
        processQueue();
        // Wait a moment for sync, then prompt again
        setTimeout(() => {
          const remainingQueue = getQueue();
          if (remainingQueue.length > 0) {
            alert(
              "Some scans are still pending. Please try again after sync completes."
            );
            return;
          }
          proceedWithReset();
        }, 1000);
        return;
      }
    }
    proceedWithReset();
  });

  function proceedWithReset() {
    const confirmReset = confirm(
      "DANGER: This will clear your total scan count and all pending offline scans. This cannot be undone. Are you sure?"
    );

    if (confirmReset) {
      localStorage.setItem("uuk_scan_total", "0");
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
      updateTotalScans();
      updateStatus();
      alert("All local data has been reset.");
    }
  }
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  updateStatus();

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
    vibrate(100);

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

  // Manual Email Logic
  showManualEmailBtn.addEventListener("click", async () => {
    // If scanner is initialized and likely running (startButton is disabled while scanning)
    if (html5QrCode && startButton.disabled) {
      try {
        await html5QrCode.stop();
        status.textContent = "Scanner stopped for manual entry";
        isTorchOn = false;
        torchToggle.textContent = "🔦";
      } catch (err) {
        console.warn("Could not stop scanner (may already be stopped):", err);
      }
    }
    scannerDiv.hidden = true;
    manualEmailDiv.hidden = false;
  });

  manualEmailCancelBtn.addEventListener("click", () => {
    manualEmailDiv.hidden = true;
    scannerDiv.hidden = false;
    manualEmailInput.value = "";
    status.textContent = "Camera inactive";
  });

  manualEmailContinueBtn.addEventListener("click", () => {
    const email = manualEmailInput.value.trim();
    if (!email) {
      alert("Please enter an email address.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    ticketId = `MANUAL:${email}`; // Prefix to distinguish from QR scans
    manualEmailDiv.hidden = true;
    consentDiv.hidden = false;

    // Haptic feedback
    vibrate(100);
  });

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
    manualEmailInput.value = "";
    manualEmailDiv.hidden = true;
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
