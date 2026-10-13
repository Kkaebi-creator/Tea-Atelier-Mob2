/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { HttpsProxyAgent } from 'https-proxy-agent'

const outboundProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const proxyAgent = outboundProxy ? new HttpsProxyAgent(outboundProxy) : undefined;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  // Use the website's shared API; respect managed cloud HTTPS egress.
  server: {
    proxy: {
      '/api': {
        target: 'https://ourtea-atelier.com',
        changeOrigin: true,
        secure: true,
        agent: proxyAgent,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
