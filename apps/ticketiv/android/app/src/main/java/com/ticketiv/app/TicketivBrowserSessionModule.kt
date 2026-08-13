package com.ticketiv.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.browser.customtabs.CustomTabsClient
import androidx.browser.customtabs.CustomTabsIntent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TicketivBrowserSessionModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = MODULE_NAME

  @ReactMethod
  fun openSession(
    url: String,
    prefersEphemeralSession: Boolean,
    allowExternalRedirects: Boolean,
    promise: Promise,
  ) {
    try {
      val uri = requireHttpsUri(url)
      val browserPackage = CustomTabsClient
        .getPackageName(reactApplicationContext, null)
        ?.takeUnless { it == reactApplicationContext.packageName }

      if (
        browserPackage != null &&
        launchCustomTab(
          uri,
          browserPackage,
          prefersEphemeralSession,
          allowExternalRedirects,
        )
      ) {
        promise.resolve(null)
        return
      }

      launchExternalBrowser(uri)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject(
        "ticketiv_browser_session_failed",
        "Unable to open the secure Ticketiv browser session.",
        error,
      )
    }
  }

  private fun launchCustomTab(
    uri: Uri,
    browserPackage: String,
    prefersEphemeralSession: Boolean,
    allowExternalRedirects: Boolean,
  ): Boolean {
    val builder = CustomTabsIntent.Builder()
      .setShowTitle(true)
      .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
      .setSendToExternalDefaultHandlerEnabled(allowExternalRedirects)

    if (
      prefersEphemeralSession &&
      CustomTabsClient.isEphemeralBrowsingSupported(reactApplicationContext, browserPackage)
    ) {
      builder.setEphemeralBrowsingEnabled(true)
    }

    val customTab = builder.build()
    customTab.intent.setPackage(browserPackage)
    customTab.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    return try {
      customTab.launchUrl(reactApplicationContext, uri)
      true
    } catch (_: ActivityNotFoundException) {
      false
    }
  }

  private fun launchExternalBrowser(uri: Uri) {
    val intent = Intent(Intent.ACTION_VIEW, uri)
      .addCategory(Intent.CATEGORY_BROWSABLE)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val packageManager = reactApplicationContext.packageManager
    val ownPackage = reactApplicationContext.packageName
    val candidates = packageManager
      .queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
      .mapNotNull { it.activityInfo?.packageName }
      .distinct()
      .filterNot { it == ownPackage }
    val defaultPackage = packageManager
      .resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
      ?.activityInfo
      ?.packageName
      ?.takeIf { it in candidates }
    val browserPackage = defaultPackage ?: candidates.firstOrNull()
      ?: throw ActivityNotFoundException("No external HTTPS browser is installed")

    intent.setPackage(browserPackage)
    reactApplicationContext.startActivity(intent)
  }

  private fun requireHttpsUri(value: String): Uri {
    val uri = Uri.parse(value.trim())
    require(uri.scheme.equals("https", ignoreCase = true) && !uri.host.isNullOrBlank()) {
      "Browser session URL must use HTTPS"
    }
    return uri
  }

  companion object {
    const val MODULE_NAME = "TicketivBrowserSession"
  }
}
