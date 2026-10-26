"""Exercise the workflow command through the runner's actual /bin/sh boundary."""
import os
from pathlib import Path
import subprocess
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
            adb.write_text('''#!/bin/sh
case "$*" in
  'shell pidof com.treesus6.skatequest')
    test "$FAIL_PID" = 0 || exit 1
    echo 1234 ;;
  'logcat -d -v time') echo 'diagnostic log' ;;
  'shell dumpsys activity activities') echo 'activity state' ;;
  'pull /sdcard/skatequest-startup.png '*) touch "$3" ;;
esac
''')
            adb.chmod(0o755)
            sleep = folder / 'sleep'
            sleep.write_text('#!/bin/sh\nexit 0\n')
            sleep.chmod(0o755)
            env = dict(os.environ, PATH=directory + os.pathsep + os.environ['PATH'],
                       FAIL_PID=str(int(fail_pid)), SMOKE_EVIDENCE_DIR=directory)
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
