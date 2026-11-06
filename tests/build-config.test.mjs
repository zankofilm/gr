import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('standalone debug bundle configuration disables Metro-dependent debug variants', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'madreseyar-gradle-'));
  const appDir = path.join(tempRoot, 'android', 'app');
  fs.mkdirSync(appDir, { recursive: true });
  const gradleFile = path.join(appDir, 'build.gradle');
  fs.writeFileSync(gradleFile, [
    'apply plugin: "com.android.application"',
    'apply plugin: "com.facebook.react"',
    '',
    'react {',
    '    entryFile = file("index.js")',
    '    bundleCommand = "export:embed"',
    '    autolinkLibrariesWithApp()',
    '}',
    '',
  ].join('\n'));

  const script = path.join(projectRoot, 'scripts', 'enable-standalone-debug-bundle.cjs');
  const result = spawnSync(process.execPath, [script], { cwd: tempRoot, encoding: 'utf8' });
  const secondRun = spawnSync(process.execPath, [script], { cwd: tempRoot, encoding: 'utf8' });

  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(secondRun.status, 0, secondRun.stderr || secondRun.stdout);
    const updated = fs.readFileSync(gradleFile, 'utf8');
    assert.match(updated, /react\s*\{\s*debuggableVariants\s*=\s*\[\s*\]/);
    assert.equal((updated.match(/debuggableVariants\s*=/g) || []).length, 1);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
