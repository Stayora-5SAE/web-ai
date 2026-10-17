import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseEnvironment } from './database-config.mjs';
test('local mode redirects application and migrations without mutating Neon configuration', () => {
  const source = {
    LOCAL_MODE: '1',
    DB_URL: 'neon-pooled',
    DB_MIGRATION_URL: 'neon-direct',
    DB_USERNAME: 'remote-user',
    DB_PASSWORD: 'remote-secret',
  };
  const local = databaseEnvironment(source);
  assert.equal(local.DB_URL, 'jdbc:postgresql://127.0.0.1:55432/stayora_local');
  assert.equal(local.DB_MIGRATION_URL, local.DB_URL);
  assert.equal(local.DB_USERNAME, 'stayora');
  assert.equal(local.DB_PASSWORD, '');
  assert.equal(source.DB_PASSWORD, 'remote-secret');
  assert.equal(source.DB_URL, 'neon-pooled');
});
test('Neon mode preserves all configured values', () => {
  const source = {
    LOCAL_MODE: '0',
    DB_URL: 'pooled',
    DB_MIGRATION_URL: 'direct',
    DB_USERNAME: 'user',
    DB_PASSWORD: 'secret',
  };
  assert.deepEqual(databaseEnvironment(source), source);
});
test('local overrides apply to both Flyway and runtime', () => {
  const env = databaseEnvironment({
    LOCAL_MODE: '1',
    LOCAL_DB_URL: 'jdbc:postgresql://localhost:5432/demo',
    LOCAL_DB_USERNAME: 'demo',
    LOCAL_DB_PASSWORD: 'local',
  });
  assert.equal(env.DB_URL, env.LOCAL_DB_URL);
  assert.equal(env.DB_MIGRATION_URL, env.LOCAL_DB_URL);
  assert.equal(env.DB_USERNAME, 'demo');
  assert.equal(env.DB_PASSWORD, 'local');
});
test('rejects invalid switch instead of accidentally connecting to Neon', () => {
  assert.throws(() => databaseEnvironment({ LOCAL_MODE: 'true' }), /LOCAL_MODE/);
});
