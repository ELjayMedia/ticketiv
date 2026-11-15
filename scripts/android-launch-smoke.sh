#!/usr/bin/env bash
# Verify the *release* JavaScript bundle can launch on an Android emulator.
# The emulator's System UI can ANR during cold boot; never confuse its dialog
# with a Ticketiv app crash or accept a merely-live app process as success.
set -euo pipefail

apk="${1:?Usage: android-launch-smoke.sh /path/to/signed.apk}"
package="com.ticketiv.app"
logs="${RUNNER_TEMP:-/tmp}/ticketiv-android-smoke.log"
xml="${RUNNER_TEMP:-/tmp}/ticketiv-android-window.xml"
screenshot="${RUNNER_TEMP:-/tmp}/ticketiv-android-window.png"
remote_xml="/sdcard/ticketiv-window.xml"

collect_logs() {
  result=$?
  adb logcat -d -v threadtime > "$logs" 2>/dev/null || true
  if (( result != 0 )); then
    echo "::error::Ticketiv Android release launch smoke failed"
    adb exec-out screencap -p > "$screenshot" 2>/dev/null || true
    adb shell dumpsys window 2>/dev/null | grep -E 'mCurrentFocus|mFocusedApp' | tail -n 10 || true
    grep -E -A 16 'FATAL EXCEPTION|Process: com\.ticketiv\.app|ANR in com\.ticketiv\.app|ReactNativeJS|AndroidRuntime' "$logs" | tail -n 120 || true
    if [[ -s "$xml" ]]; then
      echo "Latest UI hierarchy: $xml"
    fi
    echo "Full logcat: $logs"
  fi
}
trap collect_logs EXIT

test -s "$apk"
adb wait-for-device
adb install -r "$apk"
adb shell pm clear "$package" >/dev/null
adb logcat -c
adb shell am start -W -n "$package/.MainActivity"

# A successful am start is not sufficient: a JS or native startup exception
# often kills the Activity a few seconds later.
for i in 1 2 3 4 5 6; do
  sleep 3
  if ! adb shell pidof "$package" | grep -q '[0-9]'; then
    echo "::error::Ticketiv process exited during the first 18 seconds"
    exit 1
  fi
done

# UiAutomator may initially see a system dialog rather than the application.
# Require real Ticketiv text AND a node owned by the Ticketiv package. Retry
# transient emulator stalls without turning a blank app into a false success.
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if ! adb shell pidof "$package" | grep -q '[0-9]'; then
    echo "::error::Ticketiv process exited during UI verification"
    exit 1
  fi

  rm -f "$xml"
  adb shell rm -f "$remote_xml" >/dev/null 2>&1 || true
  if timeout 25s adb shell uiautomator dump "$remote_xml" >/dev/null 2>&1 &&
     adb pull "$remote_xml" "$xml" >/dev/null 2>&1 &&
     [[ -s "$xml" ]]; then
    if grep -Eq '(text|content-desc)="[^"]*Ticketiv' "$xml" &&
       grep -q 'package="com.ticketiv.app"' "$xml"; then
      adb shell pidof "$package" | grep -q '[0-9]'
      echo "Ticketiv release APK launched, stayed alive and rendered its UI."
      exit 0
    fi

    # An observed failing run (PR #569, Android API 36) was blocked by
    # "System UI isn't responding", not an app crash. Tap that dialog's
    # explicit Wait button and retry; never dismiss Ticketiv ANR dialogs.
    if grep -q "System UI isn't responding" "$xml"; then
      bounds="$(grep -oE 'resource-id="android:id/aerr_wait"[^>]*bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' "$xml" |
        sed -nE 's/.*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"/\1 \2 \3 \4/p' |
        head -n 1 || true)"
      if [[ -n "$bounds" ]]; then
        read -r left top right bottom <<< "$bounds"
        echo "::warning::Emulator System UI ANR obscured Ticketiv (attempt $attempt); selecting Wait"
        adb shell input tap "$(((left + right) / 2))" "$(((top + bottom) / 2))"
      else
        echo "::warning::Emulator System UI ANR has no detectable Wait button"
      fi
    else
      echo "Ticketiv view not visible yet (attempt $attempt/12); retrying"
    fi
  else
    echo "::warning::UiAutomator dump unavailable (attempt $attempt/12); retrying"
  fi
  sleep 5
done

echo "::error::Ticketiv UI was not rendered after 12 attempts; see hierarchy, screenshot, and logcat artifacts"
exit 1
