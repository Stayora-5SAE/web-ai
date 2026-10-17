import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { databaseEnvironment } from './database-config.mjs';
import { startLocalDatabase } from './local-db.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: `${root}.env` });
const env = databaseEnvironment(process.env);
if (env.LOCAL_MODE === '1' && process.argv.some((arg) => arg.includes('spring-boot:run'))) {
  await startLocalDatabase();
}
const windows = process.platform === 'win32';
const args = windows ? process.argv.slice(2) : ['./mvnw', ...process.argv.slice(2)];
const child = spawn(windows ? 'mvnw.cmd' : 'sh', args, {
  cwd: `${root}backend`,
  env,
  stdio: 'inherit',
  shell: windows,
});
child.on('error', () => {
  console.error('Could not start Maven Wrapper. Check Java 17 installation.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
