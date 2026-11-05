#!/usr/bin/env bash
set -euo pipefail
evidence_dir="${SMOKE_EVIDENCE_DIR:-/tmp}"
base_evidence_dir="$evidence_dir"
mkdir -p "$evidence_dir"
collect_evidence() {
  timeout 25s adb shell dumpsys activity activities > "$evidence_dir/activities.txt" || true
  logcat_collected=false
  if timeout 30s adb logcat -d -v time > "$evidence_dir/skatequest-logcat.txt"; then
    logcat_collected=true
  fi
  for attempt in 1 2 3; do
    if timeout 20s adb exec-out screencap -p > "$evidence_dir/skatequest-startup.png" && [ "$(wc -c < "$evidence_dir/skatequest-startup.png")" -gt 1000 ]; then return 0; fi
    sleep 2
  done
  rm -f "$evidence_dir/skatequest-startup.png"
}
trap collect_evidence EXIT
# GitHub-hosted emulators can expose adb before Android's package manager is ready.
# Wait for full boot and a responsive package manager before installing.
for attempt in $(seq 1 30); do
  if timeout 10s adb wait-for-device >/dev/null 2>&1 &&
     [[ "$(timeout 10s adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\\r')" == "1" ]] &&
     timeout 10s adb shell pm list packages com.android.settings >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == 30 ]]; then echo "FAIL: emulator never became boot-ready" >&2; exit 1; fi
  sleep 3
done
adb install -r /tmp/skatequest.apk
adb shell pm path com.treesus6.skatequest
# Resolve the real launcher activity rather than relying on Monkey's event injection.
component="$(timeout 30s adb shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER com.treesus6.skatequest | tr -d '\r' | tail -n 1)"
if [[ "$component" != com.treesus6.skatequest/* ]]; then echo "FAIL: unable to resolve launcher: $component" >&2; exit 1; fi
launch_and_verify() {
  local phase="$1"
  mkdir -p "$evidence_dir"
  adb logcat -c
  timeout 20s adb shell am force-stop com.treesus6.skatequest
  if timeout 20s adb shell pidof com.treesus6.skatequest >/dev/null; then
    echo "FAIL: $phase process remained alive after force-stop" >&2
    return 1
  fi
  timeout 45s adb shell am start -W -n "$component" | tee "$evidence_dir/skatequest-$phase-start.txt"
  if ! grep -Eq '^[[:space:]]*Status:[[:space:]]*ok[[:space:]]*$' "$evidence_dir/skatequest-$phase-start.txt"; then
    echo "FAIL: $phase launch did not report Status: ok" >&2
    return 1
  fi
  sleep 20
  timeout 20s adb shell pidof com.treesus6.skatequest | tee "$evidence_dir/skatequest.pid"
  collect_evidence
  # Missing or partial logs cannot establish that startup was crash-free.
  if [[ "$logcat_collected" != true ]] || [[ ! -s "$evidence_dir/skatequest-logcat.txt" ]]; then
    echo "FAIL: $phase startup log collection failed or returned no evidence" >&2
    return 1
  fi
  # A live process and screenshot can be false positives if Android returned to
  # the launcher or displayed a system crash dialog. Require the SkateQuest
  # activity to remain foregrounded after the startup settling period.
  # WindowManager output varies between Android versions, and can briefly
  # have no focused window during launcher transitions. Inspect the actual
  # focused window (not merely topResumedActivity) with bounded retries.
  local current_focus=""
  local focus_dump=""
  local candidate=""
  for attempt in 1 2 3 4 5 6; do
    focus_dump="$(timeout 20s adb shell dumpsys window windows 2>/dev/null || true)"
    if [[ -z "$focus_dump" ]]; then
      focus_dump="$(timeout 20s adb shell dumpsys window 2>/dev/null || true)"
    fi
    printf '%s\\n' "$focus_dump" > "$evidence_dir/window-focus.txt"
    candidate="$(printf '%s\\n' "$focus_dump" | grep -m1 -E 'mCurrentFocus[[:space:]]*=|mFocusedWindow[[:space:]]*=' || true)"
    # Modern Android builds also report the focused window via InputDispatcher.
    # Do not mistake mFocusedApp or a resumed activity for actual input focus.
    if [[ -z "$candidate" || "$candidate" == *'null'* ]]; then
      local input_dump
      input_dump="$(timeout 20s adb shell dumpsys input 2>/dev/null || true)"
      printf '%s\\n' "$input_dump" > "$evidence_dir/input-focus.txt"
      candidate="$(printf '%s\\n' "$input_dump" | grep -m1 -E 'FocusedWindow:|FocusedWindow[[:space:]]*=|mFocusedWindow[[:space:]]*=' || true)"
    fi
    if [[ "$candidate" == *'com.treesus6.skatequest/'* ]]; then
      current_focus="$candidate"
      break
    fi
    echo "INFO: $phase focus attempt $attempt: ${candidate:-unavailable}" >&2
    sleep 3
  done
  if [[ -z "$current_focus" ]]; then
    echo "FAIL: $phase SkateQuest was never confirmed as the focused window (see window-focus.txt and input-focus.txt)" >&2
    return 1
  fi
  # Keep activity evidence as a second independent check; never pass solely
  # because the app process exists or a system dialog has focus.
  if ! grep -E '(topResumedActivity|mResumedActivity).*com\\.treesus6\\.skatequest' "$evidence_dir/activities.txt" >/dev/null; then
    echo "FAIL: $phase app window focused but activity is not top-resumed" >&2
    return 1
  fi
  # Fail when the app logs a native or JavaScript fatal crash during startup.
  if grep -E "FATAL EXCEPTION|Fatal signal [0-9]+|ReactNativeJS.*(TypeError|ReferenceError|Invariant Violation)" "$evidence_dir/skatequest-logcat.txt" | grep -E "com\.treesus6\.skatequest|ReactNativeJS|libc" > "$evidence_dir/skatequest-fatal-lines.txt"; then
    echo "FAIL: $phase Android startup emitted a fatal error" >&2
    cat "$evidence_dir/skatequest-fatal-lines.txt" >&2
    return 1
  fi
  test -s "$evidence_dir/skatequest-startup.png" || { echo "FAIL: no $phase screenshot captured" >&2; return 1; }
  echo "PASS: $phase activity foregrounded, process alive after 20 seconds, screenshot captured"
}
launch_and_verify cold
# Keep the first launch evidence intact. A second force-stop/restart must pass
# the same foreground/crash checks; a single launch does not prove relaunch.
evidence_dir="$base_evidence_dir/skatequest-relaunch-evidence"
launch_and_verify relaunch
trap - EXIT
echo "PASS: APK installed; cold launch and force-stop/relaunch both verified"

