/// <reference path="../../types/testEnvShims.d.ts" />
import { describe, expect, it } from '@jest/globals';
import { sanitizeHtml } from '../../lib/validation';

describe('sanitizeHtml', () => {
  it('strips <xmp> and its contents', () => {
    expect(sanitizeHtml('<xmp><script>alert(1)</script></xmp>')).toBe('');
  });

  it('strips <listing> and its contents', () => {
    expect(sanitizeHtml('<listing>raw code here</listing>')).toBe('');
  });

  it('strips <plaintext> and its contents', () => {
    expect(sanitizeHtml('<plaintext>raw</plaintext>')).toBe('');
  });

  it('strips xmp but preserves surrounding text', () => {
    const result = sanitizeHtml('before<xmp><script>evil()</script></xmp>after');
    expect(result).not.toContain('<xmp>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('before');
    expect(result).toContain('after');
  });

  it('strips xmp with attributes', () => {
    expect(sanitizeHtml('<xmp class="foo"><b>bold</b></xmp>')).toBe('');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeHtml(null as any)).toBe('');
    expect(sanitizeHtml(undefined as any)).toBe('');
    expect(sanitizeHtml(42 as any)).toBe('');
  });

  it('passes safe text through', () => {
    const result = sanitizeHtml('Hello world');
    expect(result).toBe('Hello world');
  });

  it('strips disallowed script tags via sanitize-html', () => {
    const result = sanitizeHtml('<script>alert(1)</script>safe');
    expect(result).not.toContain('<script>');
    expect(result).toContain('safe');
  });
});
