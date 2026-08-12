package com.ticketiv.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Small Android-native secure key/value store used by the Ticketiv consumer app.
 *
 * Values are encrypted with an AES-256 key generated and retained by Android
 * Keystore. SharedPreferences stores only versioned IV + ciphertext envelopes;
 * plaintext ticket-wallet/session payloads are never written to disk.
 */
class TicketivSecureStorageModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val preferences = reactContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

  override fun getName(): String = MODULE_NAME

  @ReactMethod
  fun getItem(key: String, promise: Promise) {
    try {
      validateStorageKey(key)
      val envelope = preferences.getString(key, null)
      if (envelope == null) {
        promise.resolve(null)
        return
      }

      promise.resolve(decryptEnvelope(envelope))
    } catch (error: Exception) {
      promise.reject("ticketiv_secure_storage_read_failed", "Unable to read secure Ticketiv storage.", error)
    }
  }

  @ReactMethod
  fun setItem(key: String, value: String, promise: Promise) {
    try {
      validateStorageKey(key)
      val encrypted = encryptValue(value)
      val saved = preferences.edit().putString(key, encrypted).commit()
      if (!saved) {
        throw IllegalStateException("SharedPreferences commit failed")
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("ticketiv_secure_storage_write_failed", "Unable to write secure Ticketiv storage.", error)
    }
  }

  @ReactMethod
  fun removeItem(key: String, promise: Promise) {
    try {
      validateStorageKey(key)
      val removed = preferences.edit().remove(key).commit()
      if (!removed) {
        throw IllegalStateException("SharedPreferences commit failed")
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("ticketiv_secure_storage_remove_failed", "Unable to remove secure Ticketiv storage.", error)
    }
  }

  private fun encryptValue(value: String): String {
    val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())

    val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
    val ciphertext = Base64.encodeToString(
      cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8)),
      Base64.NO_WRAP,
    )

    return "$ENVELOPE_VERSION:$iv:$ciphertext"
  }

  private fun decryptEnvelope(envelope: String): String {
    val parts = envelope.split(":", limit = 3)
    if (parts.size != 3 || parts[0] != ENVELOPE_VERSION) {
      throw IllegalArgumentException("Unsupported secure-storage envelope")
    }

    val iv = Base64.decode(parts[1], Base64.NO_WRAP)
    val ciphertext = Base64.decode(parts[2], Base64.NO_WRAP)
    val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
    cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))

    return String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8)
  }

  private fun getOrCreateKey(): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    val existing = keyStore.getKey(KEY_ALIAS, null)
    if (existing is SecretKey) return existing

    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
    val spec = KeyGenParameterSpec.Builder(
      KEY_ALIAS,
      KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
    )
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setKeySize(256)
      .setRandomizedEncryptionRequired(true)
      .build()

    generator.init(spec)
    return generator.generateKey()
  }

  private fun validateStorageKey(key: String) {
    require(key.startsWith(KEY_PREFIX)) { "Ticketiv secure-storage keys must use the app namespace." }
    require(key.length <= MAX_KEY_LENGTH) { "Ticketiv secure-storage key is too long." }
  }

  companion object {
    const val MODULE_NAME = "TicketivSecureStorage"
    private const val PREFERENCES_NAME = "ticketiv.consumer.secure_storage"
    private const val KEY_ALIAS = "ticketiv.consumer.secure_storage.aes.v1"
    private const val KEY_PREFIX = "ticketiv.consumer."
    private const val ENVELOPE_VERSION = "v1"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val CIPHER_TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH_BITS = 128
    private const val MAX_KEY_LENGTH = 180
  }
}
