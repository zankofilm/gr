#!/usr/bin/env node
/**
 * Make the debug APK self-contained: React Native must bundle JS instead of
 * treating the debug variant as Metro-dependent. Run after `expo prebuild`.
 */
const fs = require('node:fs');
const path = require('node:path');

const gradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
if (!fs.existsSync(gradlePath)) {
  throw new Error(`Android Gradle file not found: ${gradlePath}`);
}

let source = fs.readFileSync(gradlePath, 'utf8');
const reactMatch = /(^|\n)([ \t]*)react\s*\{/m.exec(source);
if (!reactMatch) {
  throw new Error('React Native `react { ... }` configuration block was not found in android/app/build.gradle');
}

const openBrace = source.indexOf('{', reactMatch.index + reactMatch[1].length);
const nextBlock = source.indexOf('\n}', openBrace);
const blockEnd = nextBlock === -1 ? source.length : nextBlock;
const reactBlock = source.slice(openBrace + 1, blockEnd);

if (!/\bdebuggableVariants\s*=/.test(reactBlock)) {
  const indent = reactMatch[2] + '    ';
  const setting = `\n${indent}debuggableVariants = [] // Embed JS bundle in APK; Metro is not required\n`;
  source = source.slice(0, openBrace + 1) + setting + source.slice(openBrace + 1);
}

const updatedMatch = /(^|\n)([ \t]*)react\s*\{/m.exec(source);
const updatedOpenBrace = source.indexOf('{', updatedMatch.index + updatedMatch[1].length);
const updatedNextBlock = source.indexOf('\n}', updatedOpenBrace);
const updatedBlock = source.slice(updatedOpenBrace + 1, updatedNextBlock === -1 ? source.length : updatedNextBlock);
if (!/\bdebuggableVariants\s*=\s*\[\s*\]/.test(updatedBlock)) {
  throw new Error('Failed to configure debuggableVariants = []');
}

fs.writeFileSync(gradlePath, source);
console.log('Configured React Native debug variant to embed index.android.bundle (Metro not required).');
