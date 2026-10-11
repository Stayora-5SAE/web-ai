import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { validateLocalUrl } from './sonar.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, 'quality/.env') });
const origin = validateLocalUrl(process.env.SONAR_HOST_URL || 'http://127.0.0.1:9000');
const token = process.env.SONAR_REPORT_TOKEN || process.env.SONAR_TOKEN;
if (!token) throw new Error('Set SONAR_REPORT_TOKEN or SONAR_TOKEN in ignored quality/.env.');
async function get(endpoint, params = {}) {
  const url = new URL(endpoint, origin);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Sonar API ${endpoint}: HTTP ${response.status}`);
  return response.json();
}
try {
  const task = Object.fromEntries(
    readFileSync(path.join(root, '.scannerwork/report-task.txt'), 'utf8')
      .trim()
      .split(/\r?\n/)
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
  const ce = await get('/api/ce/task', { id: task.ceTaskId });
  if (ce.task.status !== 'SUCCESS' || !ce.task.analysisId)
    throw new Error('Analysis is not complete. Retry after the compute task succeeds.');
  const component = task.projectKey;
  const metrics = await get('/api/measures/component', {
    component,
    metricKeys:
      'software_quality_reliability_issues,software_quality_security_issues,software_quality_maintainability_issues,software_quality_reliability_rating,software_quality_security_rating,software_quality_maintainability_rating,ncloc,files,coverage,line_coverage,branch_coverage,lines_to_cover,uncovered_lines,conditions_to_cover,uncovered_conditions,duplicated_lines_density,bugs,vulnerabilities,code_smells,security_hotspots,security_hotspots_reviewed,reliability_rating,security_rating,sqale_rating,sqale_index,tests,test_errors,test_failures,skipped_tests',
  });
  const gate = await get('/api/qualitygates/project_status', { analysisId: ce.task.analysisId });
  const issues = await get('/api/issues/search', {
    componentKeys: component,
    ps: '500',
    resolved: 'false',
  });
  const hotspots = await get('/api/hotspots/search', { projectKey: component, ps: '500' });
  const tree = await get('/api/measures/component_tree', {
    component,
    qualifiers: 'DIR',
    metricKeys: 'ncloc,coverage,bugs,vulnerabilities,code_smells',
    ps: '500',
  });
  const status = await get('/api/system/status');
  const output = path.join(root, 'docs/testing-report/evidence');
  mkdirSync(output, { recursive: true });
  writeFileSync(
    path.join(output, 'sonarqube.json'),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        serverVersion: status.version,
        analysis: ce.task,
        metrics,
        gate,
        issues,
        hotspots,
        modules: tree,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `SonarQube evidence saved. Quality gate: ${gate.projectStatus.status}; unresolved findings: ${issues.paging.total}; hotspots: ${hotspots.paging.total}.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
