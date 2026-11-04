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
  if ! timeout 20s adb shell dumpsys window windows > "$evidence_dir/window-focus.txt"; then
    echo "FAIL: $phase unable to collect focused-window evidence" >&2
    return 1
  fi
  # Android may leave our activity top-resumed while a system ANR/crash dialog
  # takes actual input focus. The 2026-11-04 emulator evidence showed exactly
  # that: a Pixel Launcher ANR covered the SkateQuest sign-in screen, yet the
  # old resumed-activity-only gate passed. Do not certify an obscured screen.
  local current_focus
  current_focus="$(grep -m1 -E '^[[:space:]]*mCurrentFocus=' "$evidence_dir/window-focus.txt" || true)"
  if [[ -z "$current_focus" ]]; then
    echo "FAIL: $phase focused window is missing from collected evidence" >&2
    return 1
  fi
  if [[ "$current_focus" != *"com.treesus6.skatequest/"* ]]; then
    echo "FAIL: $phase SkateQuest is obscured by another focused window: $current_focus" >&2
    return 1
  fi
  if ! grep -E '(mCurrentFocus|mFocusedApp).*com\.treesus6\.skatequest' "$evidence_dir/window-focus.txt" >/dev/null && \
     ! grep -E '(topResumedActivity|mResumedActivity).*com\.treesus6\.skatequest' "$evidence_dir/activities.txt" >/dev/null; then
    echo "FAIL: $phase SkateQuest process exists but its activity is not foregrounded" >&2
    grep -E 'mCurrentFocus|mFocusedApp' "$evidence_dir/window-focus.txt" >&2 || true
    grep -E 'topResumedActivity|mResumedActivity' "$evidence_dir/activities.txt" >&2 || true
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

