export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  if (!req.body) {
    return res.status(400).json({ error: "No body provided" });
  }

  const {
    session_name,
    exhibitor_id,
    qr_count,
    manual_count,
    total_count,
    started_at,
    completed_at,
    barcodes,
  } = req.body;

  if (!session_name) {
    return res.status(400).json({ error: "Missing session_name" });
  }

  // Dedicated session scanning webhook
  const webhookUrl = process.env.N8N_SESSION_WEBHOOK_URL;

  if (!webhookUrl) {
    return res
      .status(500)
      .json({ error: "N8N_SESSION_WEBHOOK_URL not configured" });
  }

  const payload = {
    session_name,
    exhibitor_id,
    qr_count,
    manual_count,
    total_count,
    started_at,
    completed_at,
    barcodes: barcodes || [],
    type: "session_report",
    source: "vercel-session-scan",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Webhook integration error");

    return res.status(200).json({ ok: true });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(error);
    return res.status(500).json({ error: "Failed to send to webhook" });
  }
}
