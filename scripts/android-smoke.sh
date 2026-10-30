#!/usr/bin/env bash
set -euo pipefail
evidence_dir="${SMOKE_EVIDENCE_DIR:-/tmp}"
mkdir -p "$evidence_dir"
collect_evidence() {
  timeout 25s adb shell dumpsys activity activities > "$evidence_dir/activities.txt" || true
  timeout 30s adb logcat -d -v time > "$evidence_dir/skatequest-logcat.txt" || true
  for attempt in 1 2 3; do
    if timeout 20s adb exec-out screencap -p > "$evidence_dir/skatequest-startup.png" && [ "$(wc -c < "$evidence_dir/skatequest-startup.png")" -gt 1000 ]; then return 0; fi
    sleep 2
  done
  rm -f "$evidence_dir/skatequest-startup.png"
}
trap collect_evidence EXIT
adb install -r /tmp/skatequest.apk
adb shell pm path com.treesus6.skatequest
adb logcat -c
adb shell am force-stop com.treesus6.skatequest
# Resolve the real launcher activity rather than relying on Monkey's event injection.
component="$(timeout 30s adb shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER com.treesus6.skatequest | tr -d '\r' | tail -n 1)"
if [[ "$component" != com.treesus6.skatequest/* ]]; then echo "FAIL: unable to resolve launcher: $component" >&2; exit 1; fi
timeout 45s adb shell am start -W -n "$component"
sleep 20
timeout 20s adb shell pidof com.treesus6.skatequest | tee "$evidence_dir/skatequest.pid"
collect_evidence
trap - EXIT
test -s "$evidence_dir/skatequest-startup.png" || { echo "FAIL: no startup screenshot captured" >&2; exit 1; }
echo "PASS: APK installed, activity launched, process alive after 20 seconds, screenshot captured"
