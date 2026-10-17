export function databaseEnvironment(source) {
  const env = { ...source };
  const mode = env.LOCAL_MODE ?? '0';
  if (!['0', '1'].includes(mode)) throw new Error('LOCAL_MODE must be 1 (local) or 0 (Neon).');
  if (mode === '1') {
    env.DB_URL = env.LOCAL_DB_URL || 'jdbc:postgresql://127.0.0.1:55432/stayora_local';
    env.DB_MIGRATION_URL = env.DB_URL;
    env.DB_USERNAME = env.LOCAL_DB_USERNAME || 'stayora';
    env.DB_PASSWORD = env.LOCAL_DB_PASSWORD || '';
  }
  return env;
}
