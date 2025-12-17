export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { ticket_id, exhibitor_id, consent } = req.body;

  if (!ticket_id || !exhibitor_id) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // TODO: Replace with real storage
  console.log({
    ticket_id,
    exhibitor_id,
    consent,
    scanned_at: new Date().toISOString(),
  });

  res.status(200).json({ ok: true });
}
