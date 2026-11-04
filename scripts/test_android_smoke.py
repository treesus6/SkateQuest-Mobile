"""Exercise the workflow command through the runner's actual /bin/sh boundary."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]


class AndroidSmokeTest(unittest.TestCase):
    def run_smoke(self, fail_pid=False):
        workflow = yaml.safe_load((ROOT / '.github/workflows/android-remote-smoke.yml').read_text())
        step = next(s for s in workflow['jobs']['smoke']['steps']
                    if s.get('uses', '').startswith('reactivecircus/android-emulator-runner@'))
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            adb = folder / 'adb'
            adb.write_text('#!' + sys.executable + '''
import os
from pathlib import Path
import sys

args = ' '.join(sys.argv[1:])
state = Path(os.environ['FAKE_ANDROID_STATE'])
if args == 'install -r /tmp/skatequest.apk':
    print('Success')
elif args == 'shell pm path com.treesus6.skatequest':
    print('package:/data/app/base.apk')
elif args.startswith('shell cmd package resolve-activity '):
    print('com.treesus6.skatequest/.MainActivity')
elif args == 'logcat -c':
    pass
elif args == 'shell am force-stop com.treesus6.skatequest':
    state.unlink(missing_ok=True)
elif args == 'shell am start -W -n com.treesus6.skatequest/.MainActivity':
    state.write_text('alive')
    print('Status: ok')
elif args == 'shell pidof com.treesus6.skatequest':
    if not state.exists() or os.environ['FAIL_PID'] == '1':
        sys.exit(1)
    print('1234')
elif args == 'logcat -d -v time':
    print('diagnostic log')
elif args == 'shell dumpsys activity activities':
    print('topResumedActivity=ActivityRecord{ com.treesus6.skatequest/.MainActivity }')
elif args == 'shell dumpsys window windows':
    print('mCurrentFocus=Window{ com.treesus6.skatequest/.MainActivity }')
elif args == 'exec-out screencap -p':
    sys.stdout.buffer.write(bytes(1200))
else:
    raise RuntimeError('Unexpected adb command: ' + args)
''')
            adb.chmod(0o755)
            sleep = folder / 'sleep'
            sleep.write_text('#!/bin/sh\nexit 0\n')
            sleep.chmod(0o755)
            env = dict(os.environ, PATH=directory + os.pathsep + os.environ['PATH'],
                       FAIL_PID=str(int(fail_pid)), SMOKE_EVIDENCE_DIR=directory,
                       FAKE_ANDROID_STATE=str(folder / 'state'))
            # The action runs each script line in a new sh process.
            result = None
            for command in step['with']['script'].strip().splitlines():
                result = subprocess.run(['/bin/sh', '-c', command], cwd=ROOT,
                                        env=env, text=True, capture_output=True)
                if result.returncode:
                    break
            files = {p.name: p.read_text() for p in folder.glob('*.txt')}
            return result, files

    def test_successful_launch_crosses_sh_boundary(self):
        result, files = self.run_smoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('PASS:', result.stdout)
        self.assertIn('diagnostic log', files['skatequest-logcat.txt'])

    def test_dead_process_fails_but_retains_diagnostics(self):
        result, files = self.run_smoke(fail_pid=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('PASS:', result.stdout)
        self.assertIn('diagnostic log', files['skatequest-logcat.txt'])


if __name__ == '__main__':
    unittest.main()
