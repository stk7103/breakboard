"use client";

import { useState } from "react";
import { buttonStyles } from "@/components/ui";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-secure origin): let the user copy manually.
      window.prompt("Copy the public tester link:", url);
    }
  }

  return (
    <button type="button" onClick={copy} className={buttonStyles("primary", "sm")} aria-live="polite">
      {copied ? "✓ Link copied" : "Copy Public Tester Link"}
    </button>
  );
}
