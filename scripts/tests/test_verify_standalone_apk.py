import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

MODULE = Path(__file__).resolve().parents[1] / 'verify_standalone_apk.py'

class StandaloneApkTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / 'app.apk'
        self.sha = 'ab' * 32
        self.badging = "package: name='com.treesus6.skatequest' versionCode='48'\nlaunchable-activity: name='com.treesus6.skatequest.MainActivity'"
        self.certs = 'V2 Signer: certificate SHA-256 digest: ' + self.sha
        self.config = {'extra': {'supabaseUrl': 'https://example.supabase.co', 'supabaseAnonKey': 'public-test-key', 'mapboxAccessToken': 'pk.test'}}

    def write_apk(self, bundle=True):
        with zipfile.ZipFile(self.path, 'w') as z:
            if bundle:
                z.writestr('assets/index.android.bundle', b'bundled-app')
            z.writestr('assets/app.config', json.dumps(self.config))

    def validate(self, badging=None, certs=None):
        spec = importlib.util.spec_from_file_location('verifier', MODULE)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod.validate_apk(self.path, self.badging if badging is None else badging, self.certs if certs is None else certs, self.sha)

    def test_accepts_standalone_apk(self):
        self.write_apk()
        self.validate()

    def test_rejects_missing_bundle(self):
        self.write_apk(False)
        with self.assertRaisesRegex(ValueError, 'bundle'):
            self.validate()

    def test_rejects_debuggable_apk(self):
        self.write_apk()
        with self.assertRaisesRegex(ValueError, 'debuggable'):
            self.validate(self.badging + '\napplication-debuggable')

    def test_rejects_wrong_certificate(self):
        self.write_apk()
        with self.assertRaisesRegex(ValueError, 'certificate'):
            self.validate(certs='Signer #1 certificate SHA-256 digest: ' + 'cd' * 32)

    def test_rejects_missing_certificate(self):
        self.write_apk()
        with self.assertRaisesRegex(ValueError, 'certificate'):
            self.validate(certs='')

    def test_rejects_wrong_package(self):
        self.write_apk()
        with self.assertRaisesRegex(ValueError, 'package'):
            self.validate(self.badging.replace('com.treesus6.skatequest', 'org.example.other'))

    def test_rejects_missing_runtime_key(self):
        del self.config['extra']['mapboxAccessToken']
        self.write_apk()
        with self.assertRaisesRegex(ValueError, 'mapboxAccessToken'):
            self.validate()

    def test_rejects_fallback_backend(self):
        self.config['extra']['supabaseUrl'] = 'https://configuration-missing.supabase.co'
        self.write_apk()
        with self.assertRaisesRegex(ValueError, 'fallback'):
            self.validate()

    def test_rejects_broad_storage_permissions(self):
        self.write_apk()
        with self.assertRaisesRegex(ValueError, 'permission'):
            self.validate(self.badging + "\nuses-permission: name='android.permission.READ_MEDIA_IMAGES'")

if __name__ == '__main__':
    unittest.main()
