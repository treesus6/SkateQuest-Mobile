#!/usr/bin/env bash
set -euo pipefail

evidence_dir="${SMOKE_EVIDENCE_DIR:-/tmp}"
mkdir -p "$evidence_dir"

# Keep crash evidence even when installation or the process-alive check fails.
collect_evidence() {
  adb shell dumpsys activity activities > "$evidence_dir/activities.txt" || true
  adb logcat -d -v time > "$evidence_dir/skatequest-logcat.txt" || true
  adb shell screencap -p /sdcard/skatequest-startup.png || true
  adb pull /sdcard/skatequest-startup.png "$evidence_dir/skatequest-startup.png" || true
}
trap collect_evidence EXIT

adb install -r /tmp/skatequest.apk
adb shell pm path com.treesus6.skatequest
adb logcat -c
adb shell am force-stop com.treesus6.skatequest
adb shell monkey -p com.treesus6.skatequest -c android.intent.category.LAUNCHER 1
sleep 20
adb shell pidof com.treesus6.skatequest | tee "$evidence_dir/skatequest.pid"
echo "PASS: APK installed, launch intent dispatched, and app process alive after 20 seconds"
