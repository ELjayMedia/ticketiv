#!/usr/bin/env bash
# Verify the *release* JavaScript bundle can launch on a real Android runtime.
# Called by the GitHub Actions Android emulator after a CI-only APK signature.
set -euo pipefail

apk="${1:?Usage: android-launch-smoke.sh /path/to/signed.apk}"
package="com.ticketiv.app"
logs="${RUNNER_TEMP:-/tmp}/ticketiv-android-smoke.log"
xml="${RUNNER_TEMP:-/tmp}/ticketiv-android-window.xml"

collect_logs() {
  result=$?
  adb logcat -d -v threadtime > "$logs" 2>/dev/null || true
  if (( result != 0 )); then
    echo "::error::Ticketiv Android release launch smoke failed"
    grep -E -A 16 'FATAL EXCEPTION|Process: com\.ticketiv\.app|ReactNativeJS|AndroidRuntime' "$logs" | tail -n 120 || true
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

adb shell uiautomator dump /sdcard/ticketiv-window.xml >/dev/null
adb pull /sdcard/ticketiv-window.xml "$xml" >/dev/null

if ! grep -q 'Ticketiv' "$xml"; then
  echo "::error::Ticketiv app content was not visible in the Android UI hierarchy"
  exit 1
fi

# UI content and a live process after initialization prove more than an APK
# that merely installs. Keep the collected logcat as a CI artifact.
adb shell pidof "$package" | grep -q '[0-9]'
echo "Ticketiv release APK launched, stayed alive and rendered its UI."
