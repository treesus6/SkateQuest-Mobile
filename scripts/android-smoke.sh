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
# A live process and screenshot can be false positives if Android returned to
# the launcher or displayed a system crash dialog. Require the SkateQuest
# activity to remain foregrounded after the startup settling period.
timeout 20s adb shell dumpsys window windows > "$evidence_dir/window-focus.txt" || true
if ! grep -E '(mCurrentFocus|mFocusedApp).*com\\.treesus6\\.skatequest' "$evidence_dir/window-focus.txt" >/dev/null && \
   ! grep -E '(topResumedActivity|mResumedActivity).*com\\.treesus6\\.skatequest' "$evidence_dir/activities.txt" >/dev/null; then
  echo "FAIL: SkateQuest process exists but its activity is not foregrounded" >&2
  grep -E 'mCurrentFocus|mFocusedApp' "$evidence_dir/window-focus.txt" >&2 || true
  grep -E 'topResumedActivity|mResumedActivity' "$evidence_dir/activities.txt" >&2 || true
  exit 1
fi
# Fail when the app logs a native or JavaScript fatal crash during startup.
if grep -E "FATAL EXCEPTION|Fatal signal [0-9]+|ReactNativeJS.*(TypeError|ReferenceError|Invariant Violation)" "$evidence_dir/skatequest-logcat.txt" | grep -E "com\.treesus6\.skatequest|ReactNativeJS|libc" > "$evidence_dir/skatequest-fatal-lines.txt"; then
  echo "FAIL: Android startup emitted a fatal error" >&2
  cat "$evidence_dir/skatequest-fatal-lines.txt" >&2
  exit 1
fi
test -s "$evidence_dir/skatequest-startup.png" || { echo "FAIL: no startup screenshot captured" >&2; exit 1; }
echo "PASS: APK installed, activity foregrounded, process alive after 20 seconds, screenshot captured"
