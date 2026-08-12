import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const moduleSource = readFileSync(
  join(
    process.cwd(),
    "apps/ticketiv/android/app/src/main/java/com/ticketiv/app/TicketivSecureStorageModule.kt"
  ),
  "utf8"
);
const applicationSource = readFileSync(
  join(
    process.cwd(),
    "apps/ticketiv/android/app/src/main/java/com/ticketiv/app/MainApplication.kt"
  ),
  "utf8"
);

describe("Ticketiv Android secure storage contract", () => {
  it("keeps the encryption key inside Android Keystore and uses authenticated encryption", () => {
    expect(moduleSource).toContain('private const val ANDROID_KEYSTORE = "AndroidKeyStore"');
    expect(moduleSource).toContain('private const val CIPHER_TRANSFORMATION = "AES/GCM/NoPadding"');
    expect(moduleSource).toContain(".setKeySize(256)");
    expect(moduleSource).toContain(".setRandomizedEncryptionRequired(true)");
  });

  it("stores only a versioned encrypted envelope in SharedPreferences", () => {
    expect(moduleSource).toContain('private const val ENVELOPE_VERSION = "v1"');
    expect(moduleSource).toContain("preferences.edit().putString(key, encrypted).commit()")
    expect(moduleSource).not.toContain("putString(key, value)");
  });

  it("rejects keys outside the Ticketiv consumer namespace", () => {
    expect(moduleSource).toContain('private const val KEY_PREFIX = "ticketiv.consumer."');
    expect(moduleSource).toContain("require(key.startsWith(KEY_PREFIX))");
  });

  it("registers the native module with the React Native application", () => {
    expect(applicationSource).toContain("add(TicketivNativePackage())");
  });
});
