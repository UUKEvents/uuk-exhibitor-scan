const params = new URLSearchParams(window.location.search);

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  status.textContent = "Starting camera…";

  html5QrCode = new Html5Qrcode("qr-reader");

  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      onScanSuccess
    );

    status.textContent = "Scanning…";
  } catch (err) {
    console.error(err);
    status.textContent = "Camera failed to start";
    startButton.disabled = false;
  }
});

function onScanSuccess(decodedText) {
  if (scanLocked) return;

  const extracted = extractTicketId(decodedText);
  if (!extracted) return;

  scanLocked = true; // lock immediately
  ticketId = extracted;

  html5QrCode.stop().then(() => {
    document.getElementById("scanner").hidden = true;
    document.getElementById("consent").hidden = false;
  });
}

function extractTicketId(text) {
  try {
    const url = new URL(text);
    return url.searchParams.get("ticket_id");
  } catch {
    return null;
  }
}

async function sendScan(consent) {
  await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticket_id: ticketId,
      exhibitor_id: exhibitorId,
      exhibitor_name: exhibitorName,
      consent,
    }),
  });

  document.getElementById("consent").hidden = true;
  const result = document.getElementById("result");
  result.hidden = false;
  result.textContent = consent
    ? "Consent recorded. Thank you."
    : "Consent declined.";

  // reset after short delay
  setTimeout(() => location.reload(), 2500);
}

// Consent buttons
document.getElementById("yes").onclick = () => sendScan(true);
document.getElementById("no").onclick = () => sendScan(false);
