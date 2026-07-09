/**
 * Live third-party health checks for the internal admin panel only.
 * These call Vapi / Twilio / n8n directly with server-side secrets that
 * are NEVER exposed to the browser (no NEXT_PUBLIC_ prefix, only read in
 * Server Components / Route Handlers). If a credential isn't configured
 * yet, each check degrades to a clear "not connected" state instead of
 * throwing, so the admin page never breaks because a key is missing.
 */

export type ServiceHealth = {
  service: "vapi" | "twilio" | "n8n";
  configured: boolean;
  healthy: boolean;
  headline: string;
  detail: string;
};

export async function getVapiHealth(): Promise<ServiceHealth> {
  const key = process.env.VAPI_PRIVATE_KEY;
  if (!key) {
    return { service: "vapi", configured: false, healthy: false, headline: "Not connected", detail: "VAPI_PRIVATE_KEY missing" };
  }
  try {
    const res = await fetch("https://api.vapi.ai/assistant?limit=50", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { service: "vapi", configured: true, healthy: false, headline: "API error", detail: `Vapi responded ${res.status}` };
    }
    const assistants = (await res.json()) as unknown[];
    return {
      service: "vapi",
      configured: true,
      healthy: true,
      headline: "Connected",
      detail: `${assistants.length} assistant(s) live`,
    };
  } catch (e) {
    return { service: "vapi", configured: true, healthy: false, headline: "Unreachable", detail: String(e) };
  }
}

export async function getTwilioHealth(): Promise<ServiceHealth> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { service: "twilio", configured: false, healthy: false, headline: "Not connected", detail: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing" };
  }
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { service: "twilio", configured: true, healthy: false, headline: "API error", detail: `Twilio responded ${res.status}` };
    }
    const data = (await res.json()) as { status?: string; friendly_name?: string };
    const healthy = data.status === "active";
    return {
      service: "twilio",
      configured: true,
      healthy,
      headline: healthy ? "Active" : `Status: ${data.status}`,
      detail: data.friendly_name ?? "Twilio account",
    };
  } catch (e) {
    return { service: "twilio", configured: true, healthy: false, headline: "Unreachable", detail: String(e) };
  }
}

export async function getN8nHealth(): Promise<ServiceHealth & { recentFailures: number }> {
  const key = process.env.N8N_API_KEY;
  const base = process.env.N8N_BASE_URL;
  if (!key || !base) {
    return { service: "n8n", configured: false, healthy: false, headline: "Not connected", detail: "N8N_API_KEY / N8N_BASE_URL missing", recentFailures: 0 };
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/executions?status=error&limit=20`, {
      headers: { "X-N8N-API-KEY": key },
      cache: "no-store",
    });
    if (!res.ok) {
      return { service: "n8n", configured: true, healthy: false, headline: "API error", detail: `n8n responded ${res.status}`, recentFailures: 0 };
    }
    const data = (await res.json()) as { data?: unknown[] };
    const failures = data.data?.length ?? 0;
    return {
      service: "n8n",
      configured: true,
      healthy: failures === 0,
      headline: failures === 0 ? "No failures" : `${failures} failed run(s)`,
      detail: "Recent workflow executions",
      recentFailures: failures,
    };
  } catch (e) {
    return { service: "n8n", configured: true, healthy: false, headline: "Unreachable", detail: String(e), recentFailures: 0 };
  }
}

export async function getAllServiceHealth() {
  const [vapi, twilio, n8n] = await Promise.all([getVapiHealth(), getTwilioHealth(), getN8nHealth()]);
  return { vapi, twilio, n8n };
}
