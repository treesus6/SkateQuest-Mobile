const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { test } = require('node:test');

test('shell quoting rejects line terminators after a comment token', () => {
  const { quote } = require('shell-quote');
  for (const newline of ['\n', '\r', '\u2028', '\u2029']) {
    assert.throws(
      () => quote(['echo', 'ok', { comment: 'x' }, `a${newline}echo injected;#`]),
      TypeError
    );
  }
  assert.equal(quote(['echo', 'hello world']), "echo 'hello world'");
});

test('well-formed XML serialization rejects injected element names', () => {
  const { DOMImplementation, XMLSerializer } = require('@xmldom/xmldom');
  const doc = new DOMImplementation().createDocument(null, 'root', null);
  doc.documentElement.appendChild(doc.createElement('img src=x onerror="alert(1)"'));
  assert.throws(() =>
    new XMLSerializer().serializeToString(doc, false, undefined, { requireWellFormed: true })
  );
});

test('sanitizer does not emit live markup after a solidus textarea close', () => {
  const sanitize = require('sanitize-html');
  const output = sanitize('<textarea></textarea/><img src=x onerror="alert(1)">', {
    allowedTags: sanitize.defaults.allowedTags.concat(['textarea']),
  });
  assert.ok(!output.includes('<img'), output);
  assert.equal(sanitize('<b>safe</b><script>bad()</script>'), '<b>safe</b>');
});

test('Expo fingerprint glob and minimatch keep their CommonJS APIs', async () => {
  const fingerprintRequire = createRequire(require.resolve('@expo/fingerprint/package.json'));
  const { glob } = fingerprintRequire('glob');
  const { minimatch } = fingerprintRequire('minimatch');
  assert.equal(minimatch('app/index.tsx', '**/*.tsx'), true);
  assert.ok((await glob('package.json', { cwd: process.cwd() })).includes('package.json'));
});

test('ngrok can still create v4 UUIDs through its own dependency resolution', () => {
  const ngrokRequire = createRequire(require.resolve('@expo/ngrok'));
  const uuid = ngrokRequire('uuid');
  assert.match(uuid.v4(), /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.doesNotThrow(() => require('@expo/ngrok'));
});

test('React hooks lint dependency retains the Zod API it consumes', () => {
  const hooksRequire = createRequire(require.resolve('eslint-plugin-react-hooks'));
  const { z } = hooksRequire('zod');
  const schema = z.object({ enabled: z.boolean() });
  assert.deepEqual(schema.parse({ enabled: true }), { enabled: true });
  assert.equal(schema.safeParse({ enabled: 'yes' }).success, false);
});
