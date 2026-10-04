import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: `${root}backend/.env` });
const windows = process.platform === 'win32';
const args = windows ? process.argv.slice(2) : ['./mvnw', ...process.argv.slice(2)];
const child = spawn(windows ? 'mvnw.cmd' : 'sh', args, {
  cwd: `${root}backend`,
  env: process.env,
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
