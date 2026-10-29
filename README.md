# Tea Atelier Mobile

Tea Atelier's mobile storefront, built with **Ionic React, TypeScript, Vite, and Capacitor**. Customers can browse products, manage their account and cart, place orders, and follow order updates in a browser or Android app.

The mobile app shares the main website's backend. It does not connect directly to PostgreSQL or run its own payment server.

## Start here

The active mobile project is **[`Work/tea-atelier-mobile-new`](Work/tea-atelier-mobile-new)**. Run all npm and Capacitor commands from that folder.

```text
Tea-Atelier-Mob2/
├── README.md
└── Work/
    ├── tea-atelier-mobile-new/  # Active Ionic React / Capacitor app
    └── tea-atelier-main/        # Separate project; not the mobile build directory
```

| Service                   | Address                                              |
| ------------------------- | ---------------------------------------------------- |
| Shared website and API    | https://ourtea-atelier.com                           |
| Mobile browser deployment | https://tea-atelier-mobile-production.up.railway.app |
| Android application ID    | `com.teaatelier.mobiledist`                          |

## Requirements

- Node.js **22.12 or newer in the Node 22 release line**, or a supported newer LTS version, with npm.
- Git.
- For Android: Android Studio, **JDK 21**, Android SDK Platform **36**, and a device or emulator. The current minimum Android SDK is **24**.
- Access to the shared API and the Google OAuth configuration when testing authentication.

Use the checked-in Gradle wrapper rather than installing another Gradle version.

## Install and run in a browser

```sh
git clone https://github.com/Kkaebi-creator/Tea-Atelier-Mob2.git
cd Tea-Atelier-Mob2/Work/tea-atelier-mobile-new
npm ci
npm run dev
```

Open the local address printed by Vite. The development server proxies `/api` requests to `https://ourtea-atelier.com` when `VITE_API_URL` is empty.

**The default development proxy uses the shared deployed backend.** Actions such as registration, profile changes, orders, and contact submissions can create real records. Use a dedicated test account and the team's approved payment test configuration.

## Environment configuration

Vite reads environment values when starting the development server or building the app. Restart or rebuild after changing them. A Railway variable change does not update an APK already installed on a phone.

| Variable                | Purpose                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`          | Shared API origin. Set to `https://ourtea-atelier.com` for device builds. An empty value uses relative `/api` paths. |
| `VITE_GOOGLE_CLIENT_ID` | Google **Web application** OAuth client ID, also used as the native Google sign-in token audience.                   |

For local browser development, create `Work/tea-atelier-mobile-new/.env.development.local`:

```dotenv
VITE_API_URL=
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

For production browser or APK builds, configure the build environment or create `.env.production.local` in the same folder:

```dotenv
VITE_API_URL=https://ourtea-atelier.com
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

These local override files are ignored by Git. Check for existing `.env.production` and local overrides when a build uses an unexpected value. Values prefixed with `VITE_` are included in the client bundle: never put database credentials, Google client secrets, or PayMongo secret keys there. Those belong to the backend service.

An APK needs an absolute API origin because it has no Vite development proxy. A separately hosted production browser app also needs the API origin unless its host supplies an API reverse proxy.

## Build and install an Android APK

From `Work/tea-atelier-mobile-new`:

```sh
npm run build
npx cap sync android
npx cap open android
```

In Android Studio, choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**. Menu wording can vary by Android Studio version.

The debug APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Transfer the APK to the device and install it, or use Android Studio's Run button. Updating an existing installation requires the same application ID and signing certificate. A debug APK is for testing; distribution requires a release signing configuration. Register release signing fingerprints separately for Google sign-in and Android App Links.

After every frontend or build-time environment change, repeat **build → sync → build APK**. `cap sync` copies the built `dist` files; it does not run the Vite build.

### Java configuration

Check `android/gradle.properties` for `org.gradle.java.home`: this checkout contains a Windows-specific JDK path. Before building, replace it with your own JDK 21 path or remove that override and configure JDK 21 through Android Studio / `JAVA_HOME`. Do not copy another developer's machine path.

In Android Studio, check **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK**. Terminal and IDE builds can otherwise use different Java installations.

To inspect the terminal configuration and signing fingerprints in Windows PowerShell:

```powershell
cd android
.\gradlew --version
.\gradlew signingReport
```

On macOS/Linux, use `./gradlew` instead of `.\gradlew`.

## Google sign-in

Browser and native Android sign-in use different client integrations:

- **Browser:** Google's web sign-in button uses the Web OAuth client. Configure the actual browser origins, including the Vite development origin when needed, on that client.
- **Android APK:** `@capgo/capacitor-social-login` performs native sign-in. Google Console needs an Android OAuth client for `com.teaatelier.mobiledist` with the installed APK's **SHA-1 signing fingerprint**, in the same Google project as the Web client.
- `VITE_GOOGLE_CLIENT_ID` remains the **Web client ID**, even for Android. The shared backend must accept that token audience before issuing an app session.

Keep the SocialLogin integration in `android/app/src/main/java/com/teaatelier/mobiledist/MainActivity.java` when updating native code. Run `npx cap sync android` after dependency changes. Debug and release certificates can have different fingerprints.

## Orders, payments, and Android return links

Checkout creates an order through the shared API, then requests a PayMongo payment source when applicable. The backend owns payment credentials, provider integration, webhook handling, and order/payment status.

The app sends a return target when starting payment. Android returns use:

```text
https://ourtea-atelier.com/payment-return/android/<orderId>
```

The Android manifest registers this URL path as a verified App Link. The shared website must serve the matching package name and installed APK's **SHA-256 signing fingerprint** at:

```text
https://ourtea-atelier.com/.well-known/assetlinks.json
```

The backend's Android payment-return page must also be deployed. The client accepts the trusted return URL, opens the corresponding order confirmation screen, and reads status from the API. A return link by itself does not prove payment succeeded; confirmation may initially show processing while the backend updates.

## Project guide

Paths below are relative to `Work/tea-atelier-mobile-new`.

| Path                                       | Responsibility                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `src/App.tsx`                              | Routes, session providers, app shell, and shared theme imports.             |
| `src/pages/`                               | Shop, authentication, checkout, orders, account, and informational screens. |
| `src/components/SideMenu.tsx`              | Sidebar navigation and user details.                                        |
| `src/components/AppNavigation.tsx`         | Bottom navigation and cart badge.                                           |
| `src/context/`                             | Authentication, cart, and shared notification state.                        |
| `src/config/api.ts`, `request.ts`          | API origin and bounded request/error handling.                              |
| `src/config/checkout.ts`                   | Order creation and payment-source requests.                                 |
| `src/config/googleSignIn.ts`               | Native Google credential flow.                                              |
| `src/config/paymentReturn.ts`              | Trusted payment-return parsing and authentication navigation.               |
| `src/components/PaymentReturnListener.tsx` | Receives native app return links.                                           |
| `src/theme/`                               | Shared colors, typography, layouts, and UI polish.                          |
| `public/images/`, `public/fonts/`          | Bundled images and fonts.                                                   |
| `android/`                                 | Native Android project, app identity, permissions, and App Links.           |
| `capacitor.config.ts`                      | Capacitor app identity, web output directory, and plugin configuration.     |
| `vite.config.ts`                           | Browser tooling, development API proxy, and unit-test configuration.        |

Company History loads content from the shared website CMS. About Our Products contains local copy in `src/pages/AboutProductsPage.tsx`.

## Checks before handing off changes

Run from the mobile project folder:

```sh
npm run lint
npm run test.unit -- --run
npm run build
npx cap sync android
```

`npm run test.unit` without `-- --run` starts watch mode. `npm run test.e2e` opens the configured Cypress run; inspect `cypress/` and its configuration for server requirements before using it. A passing build or mocked unit test does not verify the deployed backend or device integrations.

For a release candidate, manually check guest navigation, registration, password/Google sign-in, profile saves, cart edits, saved addresses, both delivery options, payment success/failure/retry, returning after app closure, orders, notification badges, and logout confirmation. Check Android-specific flows on an installed APK.

## Production browser deployment

From the mobile folder, run `npm run build` and serve `dist` with a fallback to `index.html` for client-side routes. The repository provides `npm start` (`serve -s dist -l $PORT`) for hosts that supply `PORT`, such as Railway. Set the service root directory to `Work/tea-atelier-mobile-new`.

Set the two `VITE_` variables during the **build**, not just when starting the static server. The shared API must permit the deployed mobile browser origin and the necessary request methods/headers through CORS. The mobile static service does not replace the shared backend.

## Troubleshooting

| Symptom                                     | What to check                                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APK shows old UI or configuration           | Rebuild Vite, sync Android, then rebuild and install the APK.                                                                                                  |
| `Unsupported class file major version 69`   | Java 25 is being used somewhere in the Gradle toolchain. Check both launcher/daemon JVMs, `org.gradle.java.home`, and Android Studio's Gradle JDK; use JDK 21. |
| API network errors in the APK               | Check the production API origin, connectivity, and shared backend/database availability.                                                                       |
| Browser request fails CORS                  | Check the failing request/preflight and the shared backend's allowed origins, methods, and headers.                                                            |
| Google `origin_mismatch` in a browser       | Check the exact origin and the Web client ID compiled into that build.                                                                                         |
| Native Google sign-in fails                 | Check package ID, installed signing SHA-1, Web client ID/token audience, and the synced native plugin.                                                         |
| Payment stays in the browser                | Check the return URL, backend return page, hosted `assetlinks.json`, installed signing SHA-256, and device supported-link settings.                            |
| Profile/order changes fail during an outage | Check shared API/database health. Rebuilding the frontend cannot restore the backend.                                                                          |

When reporting a bug, include the platform, steps, expected/actual behavior, app version, and relevant error text. Remove tokens, credentials, and personal customer information from shared logs.
