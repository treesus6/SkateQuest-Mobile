# How Projects are Uploaded to EAS Build

This document explains how EAS Build handles project uploads and what files are included in the build process.

## Overview

When you run `eas build`, EAS CLI needs to transfer your source code from your development machine to a macOS or Linux build worker. This process involves:

1. Collecting and compressing project files into a single archive
2. Uploading that archive to private cloud storage
3. Making the archive accessible only to the build worker

## Default Upload Behavior

By default, EAS CLI creates the archive by copying all files from the root of the git repository, **excluding**:

- `.git` directory
- `node_modules` directory
- All files matched by rules from `.gitignore` (or `.easignore` if it exists)

## Using .easignore

`.easignore` supports the same path patterns as `.gitignore` files with these important notes:

- Can **only** be located in the root of your git repository
- If `.easignore` exists, **none** of the existing `.gitignore` files will be respected by EAS CLI
- Not supported if you set `requireCommit: true` in your `eas.json`

## Inspecting Archive Contents

To see exactly which files are included in your build archive, run:

```bash
eas build:inspect --platform [ios|android] --stage archive --output ~/target/output/path --profile production
```

This will extract the archive to the specified output directory (e.g., `~/target/output/path`) for inspection.

## Upload Methods

### Method 1: Default (EAS CLI Packaging)

This is the default method, or can be explicitly set using the `EAS_NO_VCS` environment variable.

**How it works:**

- Approximates `git clone --depth 1 ...`
- Allows building with a dirty git working tree
- Uses EAS CLI's own packaging algorithm

**Limitations:**

- Multiple `.gitignore` files are applied in isolation starting from the root
  - Example: If you have `test/example` in parent `.gitignore` and `!example/example1` in `test/.gitignore`, the entire `example` directory will still be ignored
- `node_modules` directory is always ignored
- If using `git-crypt`, all files are uploaded in their **non-encrypted** state as they appear in your project directory
- `.git` directory is **not** uploaded
  - Tools depending on Git repository state may behave unexpectedly
  - Example: Sentry won't be able to read commit hash when uploading source maps
- Submodule contents are included as they appear in your working directory

### Method 2: Git Clone (requireCommit Mode)

Enable this method by setting in your `eas.json`:

```json
{
  "cli": {
    "requireCommit": true
  }
}
```

**How it works:**

- Uses `git clone --depth 1 ...` to create a shallow clone
- Project uploaded to EAS Build is **exactly** the same as in Git
- Includes Git metadata: branch, commit hash, etc.

**Test locally:**

```bash
# Replace paths with your actual paths
git clone --local --no-hardlinks --depth 1 file:///path/to/your/git/repo ~/path/to/clone/to
```

Alternatively, perform a fresh `git clone` from your remote repository.

## Handling Gitignored Files

### Using Environment Variables (Recommended)

For sensitive files that are gitignored, use EAS Secrets:

1. Encode file contents with base64
2. Save the encoded string as a secret
3. Recreate the file in an EAS Build hook

See ["How to use Git submodules"](https://docs.expo.dev/build-reference/how-tos/#how-to-use-git-submodules) for an example.

### Using .easignore (Alternative)

Opt out of using Git entirely and use `.easignore` instead (see next section).

## Opting Out of Git

To completely bypass Git:

1. Set the `EAS_NO_VCS=1` environment variable
   - Skips using Git for all EAS CLI commands

2. Optionally set `EAS_PROJECT_ROOT` to define your project root
   - Use if your project root differs from the location of `eas.json`

**Important:**

- When using `EAS_NO_VCS=1` with `.easignore`:
  - Place `.easignore` in the directory pointed to by `EAS_PROJECT_ROOT` (if set)
  - Otherwise, place it in the same directory as your `eas.json`

## Best Practices

1. **Always inspect your archive** before important builds using `eas build:inspect`
2. **Never commit secrets** - use EAS Secrets for sensitive data
3. **Understand your upload method** - choose between default and `requireCommit` based on your needs
4. **Test locally** - verify Git behavior matches expectations before building
5. **Be mindful of .easignore** - it completely overrides all `.gitignore` files

## Related Files

- `eas.json` - EAS Build configuration (see /home/user/SkateQuest-Mobile/eas.json)
- `.gitignore` - Git ignore patterns
- `.easignore` - EAS-specific ignore patterns (if used)

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS CLI Reference](https://docs.expo.dev/eas/cli/)
- [Managing Secrets](https://docs.expo.dev/build-reference/variables/)
