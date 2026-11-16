/**
 * Runs once when a Next.js server instance starts, before it handles requests.
 *
 * On the Node.js runtime, trust the OS certificate store so Supabase calls work
 * behind antivirus HTTPS scanning / corporate TLS proxies (see lib/system-ca.ts).
 * The Node-only code lives in a separate module so the Edge build never sees `node:tls`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { trustSystemCertificates } = await import("./lib/system-ca");
    trustSystemCertificates();
  }
}
