document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");

  const params = new URLSearchParams(window.location.search);
  const exhibitorId = params.get("exhibitor_id");
  const exhibitorName = params.get("exhibitor_name") || "this exhibitor";

  if (!exhibitorId) {
    alert("Missing exhibitor_id");
    console.error("Missing exhibitor_id in URL params");
  }

  // UI elements
  const startButton = document.getElementById("start");
  const status = document.getElementById("status");
  const scannerDiv = document.getElementById("scanner");
  const consentDiv = document.getElementById("consent");
  const consentText = document.getElementById("consent-text");
  const resultDiv = document.getElementById("result");

  document.getElementById("exhibitor-name").textContent = exhibitorName;
  consentText.textContent = `Do you consent to share your details with ${exhibitorName} after the event?`;

  let ticketId = null;
  let html5QrCode = null;
  let scanLocked = false;

  startButton.addEventListener("click", async () => {
    console.log("Start button clicked");
    startButton.disabled = true;
    status.textContent = "Starting camera…";

    if (typeof Html5Qrcode === "undefined") {
      console.error("Html5Qrcode library not loaded");
      alert("QR library failed to load");
      startButton.disabled = false;
      return;
    }

    html5QrCode = new Html5Qrcode("qr-reader");

    try {
      console.log("Requesting camera access");
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          console.log("QR code detected:", decodedText);
          if (scanLocked) {
            console.log("Scan locked, ignoring");
            return;
          }

          const extracted = extractTicketId(decodedText);
          if (!extracted) {
            console.warn("Failed to extract ticket_id from QR");
            return;
          }

          ticketId = extracted;
          scanLocked = true;
          console.log("Ticket ID extracted:", ticketId);

          html5QrCode
            .stop()
            .then(() => {
              console.log("Camera stopped");
              scannerDiv.hidden = true;
              consentDiv.hidden = false;
              status.textContent = "";
            })
            .catch((err) => {
              console.error("Failed to stop camera", err);
            });
        }
      );
      status.textContent = "Scanning…";
      console.log("Camera started successfully");
    } catch (err) {
      console.error("Camera failed to start:", err);
      status.textContent = "Camera failed to start";
      startButton.disabled = false;
      alert("Camera failed to start: " + err.message);
    }
  });

  function extractTicketId(text) {
    try {
      const url = new URL(text);
      return url.searchParams.get("ticket_id");
    } catch (err) {
      console.error("Invalid QR code URL", err);
      return null;
    }
  }

  async function sendScan(consent) {
    console.log("Sending scan, consent:", consent);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: ticketId,
          exhibitor_id: exhibitorId,
          exhibitor_name: exhibitorName,
          consent,
        }),
      });

      if (!response.ok) throw new Error("Failed to POST to n8n");

      console.log("Scan sent successfully");
      consentDiv.hidden = true;
      resultDiv.hidden = false;
      resultDiv.textContent = consent
        ? "Consent recorded. Thank you."
        : "Consent declined.";

      setTimeout(() => location.reload(), 2500);
    } catch (err) {
      console.error("Error sending scan:", err);
      alert("Failed to record scan: " + err.message);
      scanLocked = false;
      consentDiv.hidden = true;
      scannerDiv.hidden = false;
      startButton.disabled = false;
      status.textContent = "Camera inactive";
    }
  }

  document.getElementById("yes").onclick = () => sendScan(true);
  document.getElementById("no").onclick = () => sendScan(false);
});
