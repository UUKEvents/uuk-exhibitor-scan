const exhibitorId = new URLSearchParams(window.location.search).get(
  "exhibitor_id"
);

if (!exhibitorId) {
  alert("Missing exhibitor_id");
}

let ticketId = null;

const codeReader = new ZXing.BrowserQRCodeReader();
const video = document.getElementById("preview");

codeReader.decodeFromVideoDevice(null, video, (result) => {
  if (result) {
    ticketId = extractTicketId(result.getText());
    if (ticketId) {
      codeReader.reset();
      document.getElementById("scanner").hidden = true;
      document.getElementById("consent").hidden = false;
    }
  }
});

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

// Buttons
document.getElementById("yes").onclick = () => sendScan(true);
document.getElementById("no").onclick = () => sendScan(false);
