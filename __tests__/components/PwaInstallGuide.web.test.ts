/// <reference path="../../types/testEnvShims.d.ts" />
import { describe, expect, it } from '@jest/globals';
import { isGitHubPagesHostname } from '../../components/PwaInstallGuide.web';

describe('isGitHubPagesHostname', () => {
  it.each([
    'treesus6.github.io',
    'TREEsus6.GITHUB.IO.',
  ])('accepts a real GitHub Pages hostname: %s', hostname => {
    expect(isGitHubPagesHostname(hostname)).toBe(true);
  });

  it.each([
    'github.io',
    '.github.io',
    'notgithub.io',
    'github.io.attacker.example',
    'treesus6.github.io.attacker.example',
    'sub.treesus6.github.io',
  ])('rejects a lookalike hostname: %s', hostname => {
    expect(isGitHubPagesHostname(hostname)).toBe(false);
  });
});
