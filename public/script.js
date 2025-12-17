const exhibitorId = new URLSearchParams(window.location.search).get(
  "exhibitor_id"
);

if (!exhibitorId) {
  alert("Missing exhibitor_id");
}

let ticketId = null;
let codeReader;

const video = document.getElementById("preview");
const startButton = document.getElementById("start");

startButton.addEventListener("click", async () => {
  startButton.disabled = true;

  codeReader = new ZXing.BrowserQRCodeReader();

  try {
    await codeReader.decodeFromVideoDevice(null, video, (result) => {
      if (result) {
        ticketId = extractTicketId(result.getText());
        if (ticketId) {
          codeReader.reset();
          document.getElementById("scanner").hidden = true;
          document.getElementById("consent").hidden = false;
        }
      }
    });
  } catch (err) {
    alert("Camera access failed. Please allow camera permissions.");
    startButton.disabled = false;
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
