import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const moduleSource = readFileSync(
  fileURLToPath(
    new URL(
      "../android/app/src/main/java/com/ticketiv/access/TicketivAccessSecureStorageModule.kt",
      import.meta.url
    )
  ),
  "utf8"
);
const applicationSource = readFileSync(
  fileURLToPath(
    new URL("../android/app/src/main/java/com/ticketiv/access/MainApplication.kt", import.meta.url)
  ),
  "utf8"
);

describe("Access Android secure storage contract", () => {
  it("keeps an app-scoped AES-256 key inside Android Keystore", () => {
    expect(moduleSource).toContain('private const val ANDROID_KEYSTORE = "AndroidKeyStore"');
    expect(moduleSource).toContain('private const val CIPHER_TRANSFORMATION = "AES/GCM/NoPadding"');
    expect(moduleSource).toContain('private const val KEY_ALIAS = "ticketiv.access.secure_storage.aes.v1"');
    expect(moduleSource).toContain(".setKeySize(256)");
    expect(moduleSource).toContain(".setRandomizedEncryptionRequired(true)");
  });

  it("stores only authenticated encrypted envelopes in the Access namespace", () => {
    expect(moduleSource).toContain('private const val ENVELOPE_VERSION = "v1"');
    expect(moduleSource).toContain('private const val KEY_PREFIX = "ticketiv.access."');
    expect(moduleSource).toContain("preferences.edit().putString(key, encrypted).commit()");
    expect(moduleSource).not.toContain("putString(key, value)");
  });

  it("registers the native module with the Access application", () => {
    expect(applicationSource).toContain("add(TicketivAccessNativePackage())");
  });

  it("can explicitly clear unreadable state and its invalidated key", () => {
    expect(moduleSource).toContain("fun reset(promise: Promise)");
    expect(moduleSource).toContain("preferences.edit().clear().commit()");
    expect(moduleSource).toContain("keyStore.deleteEntry(KEY_ALIAS)");
  });
});
