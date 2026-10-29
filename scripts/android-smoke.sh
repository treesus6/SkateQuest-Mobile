#!/usr/bin/env bash
set -euo pipefail

evidence_dir="${SMOKE_EVIDENCE_DIR:-/tmp}"
mkdir -p "$evidence_dir"

# Keep crash evidence even when installation or the process-alive check fails.
collect_evidence() {
  adb shell dumpsys activity activities > "$evidence_dir/activities.txt" || true
  adb logcat -d -v time > "$evidence_dir/skatequest-logcat.txt" || true
  for attempt in 1 2 3; do
    if adb exec-out screencap -p > "$evidence_dir/skatequest-startup.png" && [ "$(wc -c < "$evidence_dir/skatequest-startup.png")" -gt 1000 ]; then
      return 0
    fi
    sleep 2
  done
  rm -f "$evidence_dir/skatequest-startup.png"
}
trap collect_evidence EXIT

adb install -r /tmp/skatequest.apk
adb shell pm path com.treesus6.skatequest
adb logcat -c
adb shell am force-stop com.treesus6.skatequest
adb shell monkey -p com.treesus6.skatequest -c android.intent.category.LAUNCHER 1
sleep 20
adb shell pidof com.treesus6.skatequest | tee "$evidence_dir/skatequest.pid"
collect_evidence
trap - EXIT
if [ ! -s "$evidence_dir/skatequest-startup.png" ]; then
  echo "FAIL: no startup screenshot captured" >&2
  exit 1
fi
echo "PASS: APK installed, app process alive after 20 seconds, screenshot captured"
