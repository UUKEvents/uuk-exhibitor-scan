export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { exhibitor_id } = req.body;

  if (!exhibitor_id) {
    return res.status(400).json({ error: "Missing exhibitor_id" });
  }

  const webhookUrl = process.env.N8N_AUTH_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: "Auth webhook not configured" });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exhibitor_id }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Log the error for internal debugging if needed, but return a generic error to user
      const errorText = await response.text();
      console.error("n8n auth error:", errorText);
      throw new Error("n8n auth failed");
    }

    const data = await response.json();

    // We expect { passcode_hash: "..." } from n8n
    return res.status(200).json({ passcode_hash: data.passcode_hash });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Auth error:", error);
    return res.status(500).json({ error: "Failed to authenticate with n8n" });
  }
}
