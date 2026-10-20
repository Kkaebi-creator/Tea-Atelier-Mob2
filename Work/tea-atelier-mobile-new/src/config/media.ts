import { API_URL } from "./api";

// CMS and profile images belong to the shared website, including relative URLs.
export function mediaUrl(value?: string | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(
      value.trim(),
      `${API_URL || "https://ourtea-atelier.com"}/`,
    );
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
