import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.teaatelier.app",
  appName: "Tea Atelier",
  webDir: "out", // Next.js static export directory
  server: {
    // Remove this block for production builds; use only during local dev with live reload
    // url: "http://YOUR_LOCAL_IP:3000",
    // cleartext: true,
  },
  plugins: {
    Geolocation: {
      // iOS requires NSLocationWhenInUseUsageDescription in Info.plist
    },
  },
};

export default config;
