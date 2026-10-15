import { SocialLogin } from "@capgo/capacitor-social-login";

let initialization: Promise<void> | undefined;

export async function nativeGoogleCredential(): Promise<string> {
  const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!webClientId) throw new Error("Google sign-in is not configured.");
  if (!initialization) {
    initialization = SocialLogin.initialize({
      google: { webClientId, mode: "online" },
    }).catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
  const { result } = await SocialLogin.login({
    provider: "google",
    options: { style: "standard" },
  });
  if (result.responseType !== "online" || !result.idToken) {
    throw new Error("Google did not return a sign-in credential.");
  }
  // The shared backend verifies this ID token before issuing an app session.
  return result.idToken;
}
