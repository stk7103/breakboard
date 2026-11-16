import tls from "node:tls";

/**
 * Trust the operating system's certificate store in addition to Node's bundled
 * CAs (what `node --use-system-ca` / NODE_USE_SYSTEM_CA=1 does).
 *
 * Why: antivirus "HTTPS scanning" (e.g. AVG/Avast Web Shield) and corporate
 * proxies re-sign TLS traffic with a root certificate installed in the OS store.
 * Browsers trust it, but Node.js doesn't by default, so every request to
 * Supabase failed with `TypeError: fetch failed` (UNABLE_TO_VERIFY_LEAF_SIGNATURE).
 * Only certificates the OS already trusts are added; nothing is disabled.
 *
 * Node-only: imported from instrumentation.ts when NEXT_RUNTIME === "nodejs".
 */

// Available in Node >= 22.19 / 24.5 but not described by @types/node 20.
const nodeTls = tls as unknown as {
  getCACertificates?: (type: "default" | "system" | "bundled" | "extra") => string[];
  setDefaultCACertificates?: (certs: string[]) => void;
};

export function trustSystemCertificates(): void {
  if (process.env.NODE_USE_SYSTEM_CA === "1") return; // already enabled at process start
  if (typeof nodeTls.setDefaultCACertificates !== "function" || typeof nodeTls.getCACertificates !== "function") {
    return; // older Node: NODE_USE_SYSTEM_CA=1 remains the fallback
  }
  try {
    const merged = new Set([...nodeTls.getCACertificates("default"), ...nodeTls.getCACertificates("system")]);
    nodeTls.setDefaultCACertificates([...merged]);
  } catch (err) {
    console.warn("[breakboard] Could not load OS certificate store:", err instanceof Error ? err.message : err);
  }
}
