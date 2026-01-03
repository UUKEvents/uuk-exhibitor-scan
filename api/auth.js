const crypto = require("crypto");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  if (!req.body) {
    return res.status(400).json({ error: "Missing request body" });
  }

  const { exhibitor_id, passcode } = req.body;

  if (!exhibitor_id || !passcode) {
    return res.status(400).json({ error: "Missing exhibitor_id or passcode" });
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
      const errorText = await response.text();
      console.error("n8n auth error:", errorText);
      throw new Error("n8n auth failed");
    }

    let data;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    const hash =
      typeof data === "object" && data !== null
        ? data.passcode_hash || data.hash
        : null;

    const name =
      typeof data === "object" && data !== null
        ? data.exhibitor_name || data.name
        : null;

    if (!hash || (typeof hash === "string" && hash.includes("<!DOCTYPE"))) {
      console.error("No valid hash found in n8n response:", data);
      return res.status(500).json({ error: "Invalid response from n8n" });
    }

    // Server-side hash verification
    const inputHash = crypto
      .createHash("sha256")
      .update(passcode)
      .digest("hex")
      .toLowerCase();

    const expectedHash = hash.toString().trim().toLowerCase();

    if (inputHash === expectedHash) {
      return res.status(200).json({
        verified: true,
        exhibitor_name: name ? name.toString().trim() : null,
      });
    } else {
      return res
        .status(401)
        .json({ verified: false, error: "Invalid passcode" });
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Auth error:", error);
    return res.status(500).json({ error: "Failed to authenticate with n8n" });
  }
}
