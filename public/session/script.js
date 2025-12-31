// Diagnostic start
alert("Session Script File Parsed v3.0.1");

window.onerror = function (msg, url, lineNo, columnNo, error) {
  alert("Global Error: " + msg + "\nLine: " + lineNo + "\nCol: " + columnNo);
  return false;
};

document.addEventListener("DOMContentLoaded", () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlExhibitorId = params.get("exhibitor_id");

    // UI elements
    const sessionSetup = document.getElementById("session-setup");
    const scannerSection = document.getElementById("scanner-section");
    const startSessionBtn = document.getElementById("start-session");
    const completeSessionBtn = document.getElementById("complete-session");
    const sessionNameInput = document.getElementById("session-name");
    const exhibitorIdInput = document.getElementById("exhibitor-id");
    const torchToggle = document.getElementById("torch-toggle");
    const status = document.getElementById("status");
    const qrScansEl = document.getElementById("qr-scans");
    const manualScansEl = document.getElementById("manual-scans");
    const totalCountEl = document.getElementById("total-count");
    const manualCountDisplay = document.getElementById("manual-count-display");
    const manualPlusBtn = document.getElementById("manual-plus");
    const manualMinusBtn = document.getElementById("manual-minus");
    const resultDiv = document.getElementById("result");
    const connectivityStatus = document.getElementById("connectivity-status");
    const offlineTools = document.getElementById("offline-tools");
    const syncNowBtn = document.getElementById("sync-now");

    if (urlExhibitorId) {
      exhibitorIdInput.value = urlExhibitorId;
    }

    // State
    let qrCount = 0;
    let manualCount = 0;
    let html5QrCode = null;
    let isTorchOn = false;
    let sessionActive = false;
    let sessionStartTime = null;
    const uniqueTicketIds = new Set();

    function updateTotal() {
      const total = qrCount + manualCount;
      qrScansEl.textContent = qrCount;
      manualScansEl.textContent = manualCount;
      manualCountDisplay.textContent = manualCount;
      totalCountEl.textContent = total;
    }

    // Session Start
    startSessionBtn.addEventListener("click", () => {
      const name = sessionNameInput.value.trim();
      if (!name) {
        alert("Please enter a session name");
        return;
      }

      startSessionBtn.disabled = true;
      startSessionBtn.textContent = "Initializing Camera...";

      sessionActive = true;
      sessionStartTime = new Date().toISOString();
      sessionSetup.hidden = true;
      scannerSection.hidden = false;
      status.textContent = "Starting camera...";
      startScanner();
    });

    // Scanner Logic
    async function startScanner() {
      if (typeof Html5Qrcode === "undefined") {
        alert("QR library failed to load. Please check your connection.");
        startSessionBtn.disabled = false;
        startSessionBtn.textContent = "Start Attendance Tracking";
        return;
      }

      html5QrCode = new Html5Qrcode("qr-reader");

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess
        );
        status.textContent = "Scanner active";

        // Flashlight support
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities();
          if (capabilities && capabilities.torch) {
            torchToggle.hidden = false;
          }
        } catch (capErr) {
          console.warn("Could not get camera capabilities", capErr);
        }
      } catch (err) {
        status.textContent = "Camera failed";
        alert("Camera error: " + (err.message || err));
        console.error(err);

        // Fallback
        sessionSetup.hidden = false;
        scannerSection.hidden = true;
        startSessionBtn.disabled = false;
        startSessionBtn.textContent = "Start Attendance Tracking";
      }
    }

    let lastScanTime = 0;
    function onScanSuccess(decodedText) {
      const now = Date.now();
      if (now - lastScanTime < 1000) return; // Debounce scans

      if (uniqueTicketIds.has(decodedText)) {
        status.textContent = "Duplicate scan ignored";
        status.style.color = "var(--uuk-red)";
        setTimeout(() => {
          status.textContent = "Scanner active";
          status.style.color = "var(--text-white)";
        }, 1500);
        return;
      }

      uniqueTicketIds.add(decodedText);
      qrCount++;
      updateTotal();
      lastScanTime = now;

      // Haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate(100);
      }

      // Flash visual feedback
      const scannerEl = document.getElementById("qr-reader");
      scannerEl.style.borderColor = "var(--success-green)";
      status.textContent = "Scan confirmed";
      setTimeout(() => {
        scannerEl.style.borderColor = "var(--surface-border)";
        status.textContent = "Scanner active";
      }, 500);
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
        console.error(e);
      }
    });

    // Manual Counter
    manualPlusBtn.addEventListener("click", () => {
      manualCount++;
      updateTotal();
    });

    manualMinusBtn.addEventListener("click", () => {
      if (manualCount > 0) {
        manualCount--;
        updateTotal();
      }
    });

    // Offline Management
    const SESSION_QUEUE_KEY = "uuk_session_queue";

    function getQueue() {
      try {
        return JSON.parse(localStorage.getItem(SESSION_QUEUE_KEY) || "[]");
      } catch (e) {
        return [];
      }
    }

    function addToQueue(payload) {
      const queue = getQueue();
      queue.push(payload);
      localStorage.setItem(SESSION_QUEUE_KEY, JSON.stringify(queue));
      updateConnectivityUI();
    }

    function updateConnectivityUI() {
      const queue = getQueue();
      if (navigator.onLine) {
        connectivityStatus.textContent = "Online";
        connectivityStatus.className = "status-indicator online";
        if (queue.length > 0) processQueue();
      } else {
        connectivityStatus.textContent = `Offline (${queue.length} pending)`;
        connectivityStatus.className = "status-indicator offline";
      }
      offlineTools.hidden = queue.length === 0;
    }

    async function processQueue() {
      if (!navigator.onLine) return;
      const queue = getQueue();
      if (queue.length === 0) return;

      const payload = queue[0];
      try {
        const response = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const remaining = getQueue().slice(1);
          localStorage.setItem(SESSION_QUEUE_KEY, JSON.stringify(remaining));
          updateConnectivityUI();
          processQueue();
        }
      } catch (e) {
        console.error("Session sync failed", e);
      }
    }

    // Completion
    completeSessionBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to finish this session?")) return;

      if (html5QrCode) {
        try {
          await html5QrCode.stop();
        } catch (e) {}
      }

      const payload = {
        session_name: sessionNameInput.value,
        exhibitor_id: exhibitorIdInput.value || "N/A",
        qr_count: qrCount,
        manual_count: manualCount,
        total_count: qrCount + manualCount,
        started_at: sessionStartTime,
        completed_at: new Date().toISOString(),
      };

      scannerSection.hidden = true;
      resultDiv.hidden = false;
      resultDiv.textContent = "Submitting...";

      if (!navigator.onLine) {
        addToQueue(payload);
        resultDiv.textContent = "Saved offline. Thank you.";
        setTimeout(() => location.reload(), 3000);
        return;
      }

      try {
        const response = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          resultDiv.textContent = "Session submitted successfully!";
        } else {
          throw new Error("Server error");
        }
      } catch (e) {
        addToQueue(payload);
        resultDiv.textContent = "Saved offline.";
      }

      setTimeout(() => location.reload(), 3000);
    });

    window.addEventListener("online", updateConnectivityUI);
    window.addEventListener("offline", updateConnectivityUI);
    updateConnectivityUI();
  } catch (err) {
    alert("Runtime Error: " + err.message);
    console.error(err);
  }
});
