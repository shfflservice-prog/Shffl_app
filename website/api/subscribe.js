const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resendBaseUrl = "https://api.resend.com";
const maxBodyBytes = 4096;

function jsonBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body !== "string") return {};
  try { return JSON.parse(request.body); } catch { return {}; }
}

function allowedOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return url.hostname === "shfflapp.com"
      || url.hostname === "www.shfflapp.com"
      || url.hostname === "localhost"
      || url.hostname === "127.0.0.1"
      || url.hostname.endsWith(".vercel.app");
  } catch { return false; }
}

function hashForLogs(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function resendRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const result = await fetch(`${resendBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
        ...(options.headers || {})
      }
    });
    const data = await result.json().catch(() => ({}));
    return { ok: result.ok, status: result.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function contactPath(email) { return `/contacts/${encodeURIComponent(email)}`; }
function segmentPath(email, segmentId) { return `${contactPath(email)}/segments/${encodeURIComponent(segmentId)}`; }

function welcomeEmail(email, replyTo) {
  const payload = {
    from: process.env.RESEND_FROM_EMAIL,
    to: [email],
    subject: "You’re on the SHFFL list 🎉",
    text: ["Thanks for joining SHFFL.", "", "You’re on the list for our Delhi NCR launch in December 2026.", "", "We’ll let you know when it’s time to draw the night.", "", "— Team SHFFL"].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#060609;color:#f8f7f4;font-family:Arial,Helvetica,sans-serif"><div style="padding:40px 20px;background:#060609"><div style="max-width:560px;margin:0 auto;border:1px solid #292934;padding:36px 30px;background:#0d0d13"><div style="font-size:28px;letter-spacing:.08em;font-weight:700">SH<span style="color:#ff2f86">FF</span>L</div><div style="height:2px;width:48px;margin:24px 0;background:#24e0ff"></div><h1 style="font-size:28px;line-height:1.15;margin:0 0 22px;color:#f8f7f4">Thanks for joining SHFFL.</h1><p style="font-size:16px;line-height:1.65;color:#c5c2cf;margin:0 0 18px">You’re on the list for our Delhi NCR launch in December 2026.</p><p style="font-size:16px;line-height:1.65;color:#c5c2cf;margin:0">We’ll let you know when it’s time to draw the night.</p><p style="font-size:14px;line-height:1.6;color:#8f8b9b;margin:28px 0 0">— Team SHFFL</p></div></div></body></html>`
  };
  if (replyTo) payload.reply_to = replyTo;
  return payload;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }
  if (Number(request.headers?.["content-length"] || 0) > maxBodyBytes) return response.status(413).json({ error: "Request is too large." });
  if (!allowedOrigin(request.headers?.origin)) return response.status(403).json({ error: "Request origin is not allowed." });

  const body = jsonBody(request);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!emailPattern.test(email) || email.length > 254) return response.status(422).json({ error: "Enter a valid email address." });

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const segmentId = process.env.RESEND_WAITLIST_SEGMENT_ID;
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL;
  if (!apiKey || !fromEmail || !segmentId) return response.status(503).json({ error: "Signup is not configured yet. Please try again after launch." });

  const requestId = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : "request";
  const emailLogId = hashForLogs(email);
  try {
    let contact = await resendRequest(contactPath(email));
    if (!contact.ok && contact.status !== 404) {
      console.error("SHFFL waitlist contact lookup failed", { requestId, emailLogId, status: contact.status });
      return response.status(502).json({ error: "We could not save your email. Please try again." });
    }
    if (contact.status === 404) {
      contact = await resendRequest("/contacts", { method: "POST", body: JSON.stringify({ email }) });
      if (!contact.ok && contact.status !== 409) {
        console.error("SHFFL waitlist contact creation failed", { requestId, emailLogId, status: contact.status });
        return response.status(502).json({ error: "We could not save your email. Please try again." });
      }
      if (contact.status === 409) contact = await resendRequest(contactPath(email));
    }
    if (!contact.ok) {
      console.error("SHFFL waitlist contact could not be resolved", { requestId, emailLogId, status: contact.status });
      return response.status(502).json({ error: "We could not save your email. Please try again." });
    }
    if (contact.data?.unsubscribed === true) return response.status(409).json({ error: "This email is unsubscribed. Please resubscribe before joining again." });

    const membership = await resendRequest(segmentPath(email, segmentId), { method: "POST" });
    if (!membership.ok && membership.status !== 409) {
      console.error("SHFFL waitlist segment add failed", { requestId, emailLogId, status: membership.status });
      return response.status(502).json({ error: "We could not save your email. Please try again." });
    }

    const welcomeKey = `shffl-waitlist-welcome-${emailLogId}`;
    let emailResult;
    try {
      emailResult = await resendRequest("/emails", { method: "POST", headers: { "Idempotency-Key": welcomeKey }, body: JSON.stringify(welcomeEmail(email, replyTo)) });
    } catch (error) {
      emailResult = { ok: false, status: 0, data: { error: error instanceof Error ? error.message : "unknown" } };
    }
    if (!emailResult.ok) {
      console.error("SHFFL waitlist saved but welcome email failed", { requestId, emailLogId, status: emailResult.status });
      return response.status(202).json({ ok: true, emailSent: false });
    }
    return response.status(200).json({ ok: true, emailSent: true });
  } catch (error) {
    console.error("SHFFL waitlist provider request failed", { requestId, emailLogId, error: error instanceof Error ? error.message : "unknown" });
    return response.status(502).json({ error: "We could not save your email. Please try again." });
  }
}
