import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const moduleSource = read(
  "../android/app/src/main/java/com/ticketiv/app/TicketivBrowserSessionModule.kt"
);
const packageSource = read(
  "../android/app/src/main/java/com/ticketiv/app/TicketivNativePackage.kt"
);
const manifest = read("../android/app/src/main/AndroidManifest.xml");
const gradle = read("../android/app/build.gradle");
const appSource = read("../App.tsx");

describe("Ticketiv Android browser-session contract", () => {
  it("uses a stable AndroidX Custom Tab bound to a browser package", () => {
    expect(gradle).toContain('implementation("androidx.browser:browser:1.10.0")');
    expect(moduleSource).toMatch(/CustomTabsClient\s*\.getPackageName/);
    expect(moduleSource).toContain("customTab.intent.setPackage(browserPackage)");
    expect(moduleSource).toContain("customTab.launchUrl(reactApplicationContext, uri)");
    expect(moduleSource).toContain(
      ".setSendToExternalDefaultHandlerEnabled(allowExternalRedirects)"
    );
  });

  it("never selects Ticketiv itself for the external-browser fallback", () => {
    expect(moduleSource).toContain("val ownPackage = reactApplicationContext.packageName");
    expect(moduleSource).toContain(".filterNot { it == ownPackage }");
    expect(moduleSource).toContain("intent.setPackage(browserPackage)");
    expect(moduleSource).toContain('uri.scheme.equals("https", ignoreCase = true)');
  });

  it("declares browser visibility and registers the React Native module", () => {
    expect(manifest).toContain("android.support.customtabs.action.CustomTabsService");
    expect(manifest).toContain('<data android:scheme="https" />');
    expect(packageSource).toContain("TicketivBrowserSessionModule(reactContext)");
  });

  it("routes Ticketiv web handoffs through the native browser adapter", () => {
    expect(appSource).toContain("getTicketivAndroidBrowserSession");
    expect(appSource).toContain("await browserSession.openSession");
    expect(appSource).toContain('if (Platform.OS === "android")');
    expect(appSource).not.toContain("await Linking.openURL(`${TICKETIV_PUBLIC_ORIGIN}${normalized}`)");
  });
});
