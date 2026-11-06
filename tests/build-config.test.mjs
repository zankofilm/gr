import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('GitHub Actions builds a standalone release APK and verifies its JS bundle', () => {
  const workflow = fs.readFileSync(
    path.join(projectRoot, '.github', 'workflows', 'build-android-apk.yml'),
    'utf8'
  );

  assert.match(workflow, /:app:assembleRelease\b/);
  assert.match(workflow, /outputs\/apk\/release\/app-release\.apk/);
  assert.match(workflow, /assets\/index\.android\.bundle/);
  assert.match(workflow, /madreseyar-parent-v1\.2\.3-release-apk/);
  assert.doesNotMatch(workflow, /assembleDebug/);
  assert.doesNotMatch(workflow, /enable-standalone-debug-bundle/);
});

test('package and Android app versions are aligned for an in-place update', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const app = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'));

  assert.equal(pkg.version, '1.2.3');
  assert.equal(app.expo.version, '1.2.3');
  assert.equal(app.expo.android.versionCode, 6);
  assert.equal(app.expo.android.package, 'ir.madreseyar.parent');
});
