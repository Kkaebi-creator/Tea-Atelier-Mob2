// Empty string = relative paths (uses Vite proxy in dev, same-origin on web)
// Set VITE_API_URL in .env for native device builds pointing to Railway
const rawApiUrl = import.meta.env.VITE_API_URL ?? "";
export const API_URL = rawApiUrl.replace(/^VITE_API_URL=/i, "").trim().replace(/\/+$/, "");
