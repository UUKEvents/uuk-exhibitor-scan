export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  if (!req.body) {
    return res.status(400).json({ error: "No body provided" });
  }

  const { ticket_id, exhibitor_id, consent, rating, notes, scanned_at } =
    req.body;

  if (!ticket_id || !exhibitor_id) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: "Webhook not configured" });
  }

  const payload = {
    ticket_id,
    exhibitor_id,
    consent,
    rating: rating || 0,
    notes: notes || "",
    scanned_at: scanned_at || new Date().toISOString(),
    source: "vercel-exhibitor-scan",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("n8n webhook error");

    return res.status(200).json({ ok: true });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(error);
    return res.status(500).json({ error: "Failed to send to n8n" });
  }
}
