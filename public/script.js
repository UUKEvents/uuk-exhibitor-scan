const exhibitorId = new URLSearchParams(window.location.search).get(
  "exhibitor_id"
);

if (!exhibitorId) {
  alert("Missing exhibitor_id");
}

let ticketId = null;
let html5QrCode = null;

const status = document.getElementById("status");
const startButton = document.getElementById("start");

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  status.textContent = "Starting camera…";

  html5QrCode = new Html5Qrcode("qr-reader");

  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: 250,
      },
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
  const extracted = extractTicketId(decodedText);

  if (!extracted) return;

  ticketId = extracted;

  html5QrCode.stop();

  document.getElementById("scanner").hidden = true;
  document.getElementById("consent").hidden = false;
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
      consent,
    }),
  });

  document.getElementById("consent").hidden = true;
  const result = document.getElementById("result");
  result.hidden = false;
  result.textContent = consent
    ? "Consent recorded. Thank you."
    : "Consent declined.";

  setTimeout(() => location.reload(), 2000);
}

// Consent buttons
document.getElementById("yes").onclick = () => sendScan(true);
document.getElementById("no").onclick = () => sendScan(false);
