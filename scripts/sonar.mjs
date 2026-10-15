import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
export function validateLocalUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('This local Sonar workflow requires a loopback HTTP URL without credentials.');
  }
  return url.origin;
}
export function assertReports(base = root) {
  for (const name of [
    'backend/target/classes',
    'backend/target/test-classes',
    'backend/target/site/jacoco/jacoco.xml',
    'backend/target/sonar-libraries',
    'frontend/coverage/stayora/lcov.info',
  ]) {
    if (!existsSync(path.join(base, name))) {
      throw new Error(`Missing ${name}. Run npm run sonar:coverage first.`);
    }
  }
  if (
    !readFileSync(path.join(base, 'frontend/coverage/stayora/lcov.info'), 'utf8').includes('SF:')
  ) {
    throw new Error('LCOV has no source-file records.');
  }
  if (
    !readFileSync(path.join(base, 'backend/target/site/jacoco/jacoco.xml'), 'utf8').includes(
      '<counter',
    )
  ) {
    throw new Error('JaCoCo has no coverage counters.');
  }
}
async function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Command failed (exit ${code}).`)),
    );
  });
}
export function assertTestDatabase(value = 'jdbc:postgresql://127.0.0.1:5433/stayora_test') {
  const url = new URL(value.replace(/^jdbc:/, ''));
  if (
    url.protocol !== 'postgresql:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/stayora_test'
  ) {
    throw new Error(
      'Coverage tests must use the local disposable stayora_test database, never Neon.',
    );
  }
  return value;
}
async function main() {
  dotenv.config({ path: path.join(root, '.env') });
  const action = process.argv[2];
  if (action === 'coverage') {
    assertTestDatabase(process.env.TEST_DB_URL);
    await run('npm', ['run', 'test:coverage', '--prefix', 'frontend']);
    await run('node', [
      'scripts/backend.mjs',
      'clean',
      'verify',
      '-Pcoverage',
      'spotless:check',
      'dependency:copy-dependencies',
      '-DoutputDirectory=target/sonar-libraries',
    ]);
    return;
  }
  const url = validateLocalUrl(process.env.SONAR_HOST_URL || 'http://127.0.0.1:9000');
  if (action === 'start') {
    if (process.platform !== 'win32')
      throw new Error('Use your native SonarQube sonar.sh launcher on Unix.');
    const home = process.env.SONAR_HOME;
    const jdk = process.env.SONAR_JAVA_HOME;
    if (
      !home ||
      !jdk ||
      !existsSync(path.join(home, 'bin/windows-x86-64/StartSonar.bat')) ||
      !existsSync(path.join(jdk, 'bin/java.exe'))
    ) {
      throw new Error('Configure SONAR_HOME and SONAR_JAVA_HOME in .env. See quality/README.md.');
    }
    const env = {
      ...process.env,
      SONAR_JAVA_PATH: path.join(jdk, 'bin/java.exe'),
      SONAR_WEB_HOST: new URL(url).hostname,
      SONAR_WEB_PORT: new URL(url).port || '80',
    };
    if (process.env.SONAR_LOW_DISK_DEMO === 'true') {
      console.warn(
        'Local demo: Elasticsearch disk-watermark checks disabled. Monitor free disk space; do not use this setting for a shared server.',
      );
      env.SONAR_SEARCH_JAVAADDITIONALOPTS =
        '-Dcluster.routing.allocation.disk.threshold_enabled=false';
    }
    await run(`"${path.join(home, 'bin/windows-x86-64/StartSonar.bat')}"`, [], env);
    return;
  }
  if (action !== 'scan') throw new Error('Use start, coverage, or scan.');
  assertReports();
  if (!process.env.SONAR_TOKEN?.trim()) throw new Error('Set SONAR_TOKEN in ignored .env.');
  const home = process.env.SONAR_SCANNER_HOME;
  const scanner =
    home &&
    path.join(home, 'bin', process.platform === 'win32' ? 'sonar-scanner.bat' : 'sonar-scanner');
  if (!scanner || !existsSync(scanner)) throw new Error('Configure SONAR_SCANNER_HOME in .env.');
  if (!process.env.JAVA_HOME) throw new Error('JAVA_HOME must point to the project Java 17 JDK.');
  const env = {
    ...process.env,
    SONAR_HOST_URL: url,
    JAVA_HOME: process.env.SONAR_JAVA_HOME || process.env.JAVA_HOME,
  };
  await run(
    process.platform === 'win32' ? `"${scanner}"` : scanner,
    [
      '-Dsonar.qualitygate.wait=true',
      '-Dsonar.qualitygate.timeout=300',
      process.platform === 'win32'
        ? `"-Dsonar.java.jdkHome=${process.env.JAVA_HOME}"`
        : `-Dsonar.java.jdkHome=${process.env.JAVA_HOME}`,
      process.platform === 'win32'
        ? `"-Dsonar.nodejs.executable=${process.execPath}"`
        : `-Dsonar.nodejs.executable=${process.execPath}`,
    ],
    env,
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
