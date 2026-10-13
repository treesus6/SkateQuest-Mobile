#!/usr/bin/env python3
"""Reject APKs that need Metro, use wrong signing, or lack runtime configuration."""
import argparse
import json
import re
import subprocess
import zipfile


def validate_apk(path, badging, certificates, expected_sha256):
    if not re.search(r"^package: name='com\.treesus6\.skatequest'", badging, re.M):
        raise ValueError('Unexpected Android package')
    if 'application-debuggable' in badging:
        raise ValueError('APK is debuggable; a standalone release is required')
    if 'launchable-activity:' not in badging:
        raise ValueError('APK has no launchable activity')
    for name in ('READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO'):
        if 'android.permission.' + name in badging:
            raise ValueError('Forbidden broad storage permission: ' + name)
    expected = expected_sha256.replace(':', '').lower()
    actual = set(re.findall(r'certificate SHA-256 digest: ([0-9a-fA-F]{64})\b', certificates))
    if not re.fullmatch(r'[0-9a-f]{64}', expected) or {s.lower() for s in actual} != {expected}:
        raise ValueError('APK signing certificate does not match the expected Play upload certificate')
    with zipfile.ZipFile(path) as apk:
        try:
            bundle = apk.getinfo('assets/index.android.bundle')
        except KeyError as exc:
            raise ValueError('APK has no bundled JavaScript; it may require a development server') from exc
        if bundle.file_size == 0:
            raise ValueError('APK contains an empty JavaScript bundle')
        config = json.loads(apk.read('assets/app.config'))
        extra = config.get('extra') or {}
        for name in ('supabaseUrl', 'supabaseAnonKey', 'mapboxAccessToken'):
            if not isinstance(extra.get(name), str) or not extra[name].strip():
                raise ValueError('Missing runtime setting: ' + name)
        if 'configuration-missing' in extra['supabaseUrl']:
            raise ValueError('APK uses the missing-configuration fallback backend')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk')
    parser.add_argument('--aapt', required=True)
    parser.add_argument('--apksigner', required=True)
    parser.add_argument('--expected-sha256', required=True)
    args = parser.parse_args()
    # check=True means invalid APK signatures fail even if a certificate is printed.
    certificates = subprocess.check_output([args.apksigner, 'verify', '--verbose', '--print-certs', args.apk], text=True)
    badging = subprocess.check_output([args.aapt, 'dump', 'badging', args.apk], text=True)
    validate_apk(args.apk, badging, certificates, args.expected_sha256)
    print('Verified standalone SkateQuest APK: bundled app, release manifest, runtime configuration and expected upload certificate.')


if __name__ == '__main__':
    main()
