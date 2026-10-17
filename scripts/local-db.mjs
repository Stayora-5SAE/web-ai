import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { databaseEnvironment } from './database-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: join(root, '.env') });
const data = join(root, '.local', 'postgres');
const windows = process.platform === 'win32';
function binary(name) {
  const executable = name + (windows ? '.exe' : '');
  const candidates = [process.env.PG_BIN];
  if (windows && existsSync('C:/custom/bins/postgresql')) {
    candidates.push(
      ...readdirSync('C:/custom/bins/postgresql')
        .sort()
        .reverse()
        .map((version) => `C:/custom/bins/postgresql/${version}/pgsql/bin`),
    );
  }
  for (const folder of candidates.filter(Boolean)) {
    if (existsSync(join(folder, executable))) return join(folder, executable);
  }
  return executable;
}
function run(name, args, env = {}, capture = false) {
  const result = spawnSync(binary(name), args, {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    windowsHide: true,
  });
  if (result.error || result.status !== 0)
    throw new Error(`${name} failed. Check PostgreSQL tools, connectivity and configuration.`);
  return result.stdout?.trim() || '';
}
function localConnection() {
  const env = databaseEnvironment({ ...process.env, LOCAL_MODE: '1' });
  const url = new URL(env.DB_URL.replace(/^jdbc:/, ''));
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('Local database must use a loopback host.');
  const database = url.pathname.slice(1);
  if (
    !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(database) ||
    !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(env.DB_USERNAME)
  )
    throw new Error('Invalid local database or role name.');
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGDATABASE: database,
    PGUSER: env.DB_USERNAME,
    PGPASSWORD: env.DB_PASSWORD,
  };
}
export async function startLocalDatabase() {
  const connection = localConnection();
  mkdirSync(dirname(data), { recursive: true });
  if (!existsSync(join(data, 'PG_VERSION'))) {
    run('initdb', [
      '-D',
      data,
      '-U',
      connection.PGUSER,
      '--encoding=UTF8',
      '--locale=C',
      '--auth-local=trust',
      '--auth-host=trust',
    ]);
  }
  const status = spawnSync(binary('pg_ctl'), ['-D', data, 'status'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  if (status.status !== 0)
    run('pg_ctl', [
      '-D',
      data,
      '-l',
      join(dirname(data), 'postgres.log'),
      '-o',
      `-h 127.0.0.1 -p ${connection.PGPORT}`,
      '-w',
      'start',
    ]);
  const admin = { ...connection, PGDATABASE: 'postgres' };
  const found = run(
    'psql',
    [
      '-X',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `SELECT 1 FROM pg_database WHERE datname='${connection.PGDATABASE}'`,
    ],
    admin,
    true,
  );
  if (found !== '1') run('createdb', [connection.PGDATABASE], admin);
  console.log('Local PostgreSQL is ready on loopback.');
}
async function copyNeon() {
  await startLocalDatabase();
  const local = localConnection();
  const tables = run(
    'psql',
    [
      '-X',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      "SELECT count(*) FROM pg_tables WHERE schemaname='stayora'",
    ],
    local,
    true,
  );
  if (tables !== '0')
    throw new Error(
      'Local Stayora tables already exist. Copy refuses to overwrite them; choose a fresh LOCAL_DB_URL.',
    );
  const source = new URL(
    (process.env.DB_MIGRATION_URL || process.env.DB_URL || '').replace(/^jdbc:/, ''),
  );
  if (!source.hostname.endsWith('.neon.tech'))
    throw new Error('Copy source must be the configured Neon database.');
  const remote = {
    PGHOST: source.hostname,
    PGPORT: source.port || '5432',
    PGDATABASE: source.pathname.slice(1),
    PGUSER: process.env.DB_USERNAME,
    PGPASSWORD: process.env.DB_PASSWORD,
    PGSSLMODE: 'require',
    PGCONNECT_TIMEOUT: '30',
  };
  const archive = join(root, '.local', 'neon-stayora.dump');
  console.log('Reading the Stayora schema and data from Neon…');
  run(
    'pg_dump',
    ['--format=custom', '--schema=stayora', '--no-owner', '--no-acl', '--file', archive],
    remote,
  );
  run(
    'pg_restore',
    [
      '--dbname',
      local.PGDATABASE,
      '--no-owner',
      '--no-acl',
      '--exit-on-error',
      '--single-transaction',
      archive,
    ],
    local,
  );
  const count = run(
    'psql',
    ['-X', '-At', '-c', 'SELECT count(*) FROM stayora.properties'],
    local,
    true,
  );
  console.log(`Neon copy completed: ${count} properties. Archive kept in ignored .local/.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const command = process.argv[2] || 'start';
    if (command === 'start') await startLocalDatabase();
    else if (command === 'copy') await copyNeon();
    else if (command === 'stop') run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
    else throw new Error('Use start, copy or stop.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
