const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

// Exercise the real shell script. Only the external Android device and
// twenty-second settling delay are replaced; file collection and gates are real.
function runSmoke(scenario) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'android-smoke-test-'));
  const bin = path.join(root, 'bin');
  const evidence = path.join(root, 'evidence');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'adb'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2).join(' ');
const stateFile = process.env.FAKE_ANDROID_STATE;
let state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile)) : { starts: 0, alive: false };
const second = () => state.starts === 2;
if (args === 'wait-for-device') {}
else if (args === 'shell getprop sys.boot_completed') console.log('1');
else if (args === 'shell pm list packages com.android.settings') console.log('package:com.android.settings');
else if (args.startsWith('install -r ')) console.log('Success');
else if (args === 'shell pm path com.treesus6.skatequest') console.log('package:/data/app/base.apk');
else if (args === 'logcat -c') {}
else if (args === 'shell am force-stop com.treesus6.skatequest') state.alive = false;
else if (args.startsWith('shell cmd package resolve-activity ')) console.log('com.treesus6.skatequest/.MainActivity');
else if (args === 'shell am start -W -n com.treesus6.skatequest/.MainActivity') {
  state.starts++;
  state.alive = true;
  console.log(second() && process.env.FAKE_ANDROID_SCENARIO === 'start-error' ? 'Status: error' : 'Status: ok');
  console.log('LaunchState: COLD');
  console.log('Activity: com.treesus6.skatequest/.MainActivity');
} else if (args === 'shell pidof com.treesus6.skatequest') {
  if (!state.alive) process.exitCode = 1;
  else console.log(2000 + state.starts);
} else if (args === 'shell dumpsys activity activities' || args === 'shell dumpsys window windows') {
  if (second() && process.env.FAKE_ANDROID_SCENARIO === 'window-error' && args === 'shell dumpsys window windows') process.exit(1);
  const app = second() && process.env.FAKE_ANDROID_SCENARIO === 'background' ? 'com.android.launcher' : 'com.treesus6.skatequest';
  // The activity can be resumed while a system ANR dialog covers it.
  const overlay = second() && (process.env.FAKE_ANDROID_SCENARIO === 'system-dialog' ||
    (process.env.FAKE_ANDROID_SCENARIO === 'activity-dialog' && args === 'shell dumpsys activity activities') ||
    (process.env.FAKE_ANDROID_SCENARIO === 'window-dialog' && args === 'shell dumpsys window windows'));
  if (!(second() && (['missing-focus', 'input-focus', 'input-dialog'].includes(process.env.FAKE_ANDROID_SCENARIO) ||
    (['activity-focus', 'activity-dialog'].includes(process.env.FAKE_ANDROID_SCENARIO) && args === 'shell dumpsys window windows')))) {
    console.log('mCurrentFocus=Window{ ' + (overlay ? 'Application Not Responding: com.google.android.apps.nexuslauncher' : app + '/.MainActivity') + ' }');
  }
  console.log('mFocusedApp=ActivityRecord{ com.treesus6.skatequest/.MainActivity }');
  console.log('topResumedActivity=ActivityRecord{ ' + app + '/.MainActivity }');
} else if (args === 'shell dumpsys input') {
  if (second() && process.env.FAKE_ANDROID_SCENARIO === 'input-focus') console.log('FocusedWindow: name=com.treesus6.skatequest/.MainActivity');
  else if (second() && process.env.FAKE_ANDROID_SCENARIO === 'input-dialog') console.log('FocusedWindow: name=Application Not Responding: com.google.android.apps.nexuslauncher');
} else if (args === 'logcat -d -v time') {
  if (second() && process.env.FAKE_ANDROID_SCENARIO === 'logcat-error') { console.log('partial log before device disconnected'); process.exit(1); }
  if (!(second() && process.env.FAKE_ANDROID_SCENARIO === 'empty-logcat')) console.log('ActivityTaskManager: Displayed com.treesus6.skatequest/.MainActivity');
  if (second() && process.env.FAKE_ANDROID_SCENARIO === 'fatal') console.log('ReactNativeJS: TypeError: relaunch crashed');
} else if (args === 'exec-out screencap -p') process.stdout.write(Buffer.alloc(1200, 1));
else throw new Error('Unexpected adb command: ' + args);
fs.writeFileSync(stateFile, JSON.stringify(state));
`, { mode: 0o755 });
  const result = spawnSync('bash', [path.join(__dirname, 'android-smoke.sh')], {
    encoding: 'utf8',
    timeout: 10000,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      SMOKE_EVIDENCE_DIR: evidence,
      FAKE_ANDROID_STATE: path.join(root, 'state.json'),
      FAKE_ANDROID_SCENARIO: scenario,
    },
  });
  return { result, root, evidence, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('requires two launches and retains separate cold and relaunch evidence', () => {
  const run = runSmoke('success');
  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(run.root, 'state.json'))).starts, 2);
    for (const name of ['skatequest-cold-start.txt', 'skatequest-startup.png', 'skatequest-relaunch-evidence/skatequest-relaunch-start.txt', 'skatequest-relaunch-evidence/skatequest-startup.png']) {
      assert.ok(fs.statSync(path.join(run.evidence, name)).size > 0, name);
    }
  } finally { run.cleanup(); }
});

for (const scenario of ['start-error', 'background', 'fatal', 'system-dialog', 'window-dialog', 'window-error', 'missing-focus', 'input-dialog', 'activity-dialog', 'logcat-error', 'empty-logcat']) {
  test(`rejects relaunch ${scenario} even after a successful cold launch`, () => {
    const run = runSmoke(scenario);
    try {
      assert.equal(run.result.error, undefined);
      assert.notEqual(run.result.status, null, run.result.stderr);
      assert.notEqual(run.result.status, 0, run.result.stdout);
      assert.match(run.result.stdout + run.result.stderr, /FAIL:/);
      assert.ok(fs.statSync(path.join(run.evidence, 'skatequest-cold-start.txt')).size > 0);
      assert.ok(fs.statSync(path.join(run.evidence, 'skatequest-relaunch-evidence/skatequest-relaunch-start.txt')).size > 0);
    } finally { run.cleanup(); }
  });
}


test('accepts InputDispatcher focused window when WindowManager omits mCurrentFocus', () => {
  const run = runSmoke('input-focus');
  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    assert.match(fs.readFileSync(path.join(run.evidence, 'skatequest-relaunch-evidence/input-focus.txt'), 'utf8'), /FocusedWindow:.*com\.treesus6\.skatequest/);
  } finally { run.cleanup(); }
});

test('accepts a real focused window reported only by activity diagnostics', () => {
  const run = runSmoke('activity-focus');
  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    assert.match(fs.readFileSync(path.join(run.evidence, 'skatequest-relaunch-evidence/activities.txt'), 'utf8'), /mCurrentFocus=.*com\.treesus6\.skatequest/);
  } finally { run.cleanup(); }
});
