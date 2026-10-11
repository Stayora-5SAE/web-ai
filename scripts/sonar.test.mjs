import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateLocalUrl, assertTestDatabase, assertReports } from './sonar.mjs';

test('local Sonar URL accepts localhost and loopback', () => {
  assert.equal(validateLocalUrl('http://127.0.0.1:9000'), 'http://127.0.0.1:9000');
  assert.equal(validateLocalUrl('http://localhost:9000/'), 'http://localhost:9000');
});
test('Sonar workflow rejects remote and credential-bearing URLs', () => {
  for (const url of [
    'http://remote.example:9000',
    'http://admin:secret@localhost:9000',
    'file:///tmp/server',
    'http://localhost:9000/?token=secret',
  ]) {
    assert.throws(() => validateLocalUrl(url));
  }
});
test('coverage uses the local disposable database', () => {
  assert.equal(assertTestDatabase(), 'jdbc:postgresql://127.0.0.1:5433/stayora_test');
});
test('coverage rejects Neon and another local database', () => {
  for (const url of [
    'jdbc:postgresql://example.neon.tech/stayora_test',
    'jdbc:postgresql://localhost/neondb',
    'jdbc:mysql://localhost/stayora_test',
  ])
    assert.throws(() => assertTestDatabase(url));
});
test('missing reports fail before a scanner can publish a misleading analysis', () => {
  assert.throws(() => assertReports(mkdtempSync(path.join(tmpdir(), 'stayora-sonar-'))), /Missing/);
});
test('coverage reports must contain real counters and source records', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'stayora-sonar-'));
  for (const dir of [
    'backend/target/classes',
    'backend/target/test-classes',
    'backend/target/site/jacoco',
    'backend/target/sonar-libraries',
    'frontend/coverage/stayora',
  ])
    mkdirSync(path.join(base, dir), { recursive: true });
  const lcov = path.join(base, 'frontend/coverage/stayora/lcov.info');
  const jacoco = path.join(base, 'backend/target/site/jacoco/jacoco.xml');
  writeFileSync(lcov, '');
  writeFileSync(jacoco, '<report/>');
  assert.throws(() => assertReports(base), /LCOV/);
  writeFileSync(lcov, 'SF:src/app/app.component.ts');
  assert.throws(() => assertReports(base), /JaCoCo/);
  writeFileSync(jacoco, '<report><counter type="LINE" missed="1" covered="2"/></report>');
  assert.doesNotThrow(() => assertReports(base));
});
