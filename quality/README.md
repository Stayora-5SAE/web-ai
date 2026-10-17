# Local SonarQube quality workflow

This workflow analyzes Stayora's Java, TypeScript, Angular templates and resources on a native local SonarQube Community server. The application retains **Java 17, Spring Boot 3.3.6 and Angular 18.2.14**. SonarQube and its scanner use a separate newer Java runtime; the project `JAVA_HOME` remains Java 17.

SonarQube provides static issue analysis and imports measured test coverage. The coverage-generating tests are dynamic tests, not static tests. The French software-testing deliverable should distinguish these categories and report the actual quality gate, findings and measured coverage without claiming an unexecuted or successful analysis.

## Tools and local configuration

| Tool                        | Local workflow version                                        | Installation path                                       |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| SonarQube Community Build   | 26.9.0.129388, native ZIP                                     | `C:/custom/bins/sonarqube/sonarqube-26.9.0.129388`      |
| SonarScanner CLI            | 8.1.0.6389, universal ZIP                                     | `C:/custom/bins/sonar-scanner/sonar-scanner-8.1.0.6389` |
| Separate Sonar Java runtime | Supported JDK 21 or 25; this environment uses JDK 21.0.12.1+1 | `C:/custom/bins/jdk/jdk-21.0.12.1+1`                    |
| Project Java runtime        | Java 17                                                       | Existing project `JAVA_HOME`                            |
| Project Node runtime        | Node 22                                                       | Existing Node 22 setup                                  |

Tools, caches and server data stay outside the repository under `C:/custom/bins`. There is no SonarQube Docker requirement. The universal scanner distribution requires a preinstalled JVM; see the [official scanner distribution instructions](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner). The version numbers above record this project's configured local tools rather than promising the newest releases.

For a new machine, extract the [SonarQube ZIP](https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-26.9.0.129388.zip) under `C:/custom/bins/sonarqube` and the [scanner ZIP](https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-8.1.0.6389.zip) under `C:/custom/bins/sonar-scanner`. Install a supported JDK 21 or 25 under `C:/custom/bins/jdk`, then adapt `SONAR_JAVA_HOME`. Retain Java 17 for the project. Check the official server hardware/free-disk requirements before starting a normal instance.

From the repository root, install the root dependencies and copy the example only if no local file already exists:

```powershell
npm ci
Copy-Item .env.example .env
```

Set paths for your machine in ignored `.env`:

```dotenv
SONAR_HOST_URL=http://127.0.0.1:9000
SONAR_HOME=C:/custom/bins/sonarqube/sonarqube-26.9.0.129388
SONAR_JAVA_HOME=C:/custom/bins/jdk/jdk-21.0.12.1+1
SONAR_SCANNER_HOME=C:/custom/bins/sonar-scanner/sonar-scanner-8.1.0.6389
SONAR_USER_HOME=C:/custom/bins/sonar-cache
SONAR_TOKEN=YOUR_LOCAL_PROJECT_ANALYSIS_TOKEN
SONAR_REPORT_TOKEN=YOUR_LOCAL_READ_CAPABLE_USER_TOKEN
SONAR_LOW_DISK_DEMO=false
```

`SONAR_TOKEN` is a placeholder here. Generate a project analysis token through the local SonarQube UI and place the real value only in ignored `.env`. It must not enter command arguments, source files, screenshots, CI artifacts or the French report. The same root file also holds application database/AI configuration. Never copy the application database password into a Sonar property file.

Check `$env:JAVA_HOME` still identifies Java 17 before generating Java coverage. The launcher passes `SONAR_JAVA_HOME` only to Sonar processes, and tells the analyzer where the project's Java 17 JDK lives. It does not require a permanent PATH change or replacement of the project's JDK.

## 1. Start the native local server

Use a dedicated foreground terminal at the repository root:

```powershell
npm run sonar:start
```

Leave that terminal running. The Windows launcher calls the ZIP distribution's `StartSonar.bat`, selects the separate Sonar Java runtime and binds the web UI to the loopback address from `SONAR_HOST_URL`. Wait until the server reports it is operational, then open [the local SonarQube UI](http://127.0.0.1:9000).

On a new installation, perform the local administrator password setup, create project **Stayora** with key **stayora**, and generate a project analysis token under **My Account → Security**. Store it in `.env`. Native ZIP installations support an embedded H2 database for evaluation; this workflow keeps Sonar's evaluation data separate from Stayora and Neon. See the [official ZIP installation guide](https://docs.sonarsource.com/sonarqube-community-build/server-installation/from-zip-file/basic-installation).

Stop the foreground server using its terminal when the analysis/demonstration is finished. Unix contributors can use the native distribution's `sonar.sh` launcher; the provided `sonar:start` wrapper currently targets Windows.

### Limited low-disk demonstration option

The default is `SONAR_LOW_DISK_DEMO=false`. If a short local demonstration must run on a machine below the search engine's disk-space recommendation, `SONAR_LOW_DISK_DEMO=true` temporarily disables Elasticsearch disk-watermark allocation checks for the launched local server. The launcher visibly announces this exception.

This option does not create free space or protect the disk from filling. Monitor free space, stop the server after the short demonstration and restore `false`. Do not use the option for a shared, long-running or deployed SonarQube server. Freeing disk space and retaining the default is the normal setup.

## 2. Generate real coverage and Java analysis inputs

Start the **disposable local PostgreSQL database named `stayora_test` on port 5433**, following the root README's test setup. The existing test database configuration uses user/password `stayora` for that local disposable database. It is separate from application Neon credentials. A native PostgreSQL installation is also suitable; SonarQube itself runs from its native ZIP in either case.

Run from a second terminal:

```powershell
npm run sonar:test
npm run sonar:coverage
```

`sonar:test` runs the Node test suite for local URL, database and report guards without launching SonarQube. `sonar:coverage` runs Angular's coverage configuration and the Maven coverage profile with **JaCoCo 0.8.15**, verifies the backend, checks Java formatting and creates the dependency library directory needed by Java analysis. Chrome/Chromium must be installed for the Angular headless tests; set `CHROME_BIN` if it is not detected.

The local coverage command rejects remote database hosts and database names other than `stayora_test`. Integration-test cleanup independently checks the database name. Use the standard local port 5433; never point coverage cleanup at the application database or Neon. If your disposable database settings differ, supply only its local `TEST_DB_URL`, `TEST_DB_USERNAME` and `TEST_DB_PASSWORD` to the test process.

Outputs:

| Output                                  | Purpose                                    |
| --------------------------------------- | ------------------------------------------ |
| `frontend/coverage/stayora/lcov.info`   | Actual Angular line/branch coverage import |
| `frontend/coverage/stayora/`            | Human-readable frontend coverage report    |
| `backend/target/site/jacoco/jacoco.xml` | Actual Java coverage import                |
| `backend/target/site/jacoco/`           | Human-readable Java coverage report        |
| `backend/target/classes`                | Compiled production Java classes           |
| `backend/target/test-classes`           | Compiled Java test classes                 |
| `backend/target/sonar-libraries/*.jar`  | Dependency classes for Java analysis       |
| `backend/target/surefire-reports/`      | Executed backend test results              |

Generated outputs are ignored. Regenerate them after source changes. The scan wrapper checks that reports and compiled inputs exist and that LCOV/JaCoCo contain source records/counters. It rejects missing inputs rather than silently reporting an analysis without measured coverage.

## 3. Scan and wait for the quality gate

With the local server running and token configured:

```powershell
npm run sonar:scan
```

The scanner reads the committed `sonar-project.properties`, imports both coverage reports and analyzes production sources without blanket issue/coverage exclusions. Test specs are classified as tests; generated coverage support code is excluded from production indexing. The wrapper supports only loopback HTTP Sonar URLs and keeps the token in the environment.

The command waits for the server to process the analysis and return the quality gate. It returns a nonzero exit code for a failed gate or unsuccessful analysis, including a gate wait timeout. A completed scanner upload alone does not mean the gate passed. Review [the Stayora dashboard](http://127.0.0.1:9000/dashboard?id=stayora) for the actual gate, coverage, duplication, issues and security hotspots.

Record the actual SonarQube/scanner versions, scan timestamp, analyzed revision, gate conditions/results and report paths in the French testing deliverable. Distinguish total-code metrics from new-code metrics and pending hotspot review from a verified vulnerability. Retain failure evidence, fix supported findings, regenerate coverage when appropriate and rescan; do not invent a pass or lower thresholds to conceal findings.

## 4. Export evidence for the report

```powershell
npm run sonar:export
```

This reads the completed task in `.scannerwork/report-task.txt` and saves metrics, findings, hotspots and gate conditions to `docs/testing-report/evidence/sonarqube.json`. A project analysis token may lack hotspot read permissions; use a local user token with the required project permissions in `SONAR_REPORT_TOKEN`. Keep both tokens in ignored `.env`. The locally generated administrator password is also stored there as `SONAR_ADMIN_PASSWORD`; no real credential is committed.

The professor's [French report](../docs/testing-report/rapport.pdf) contains the executed results and screenshots. Its Markdown source, raw scanner/test logs, coverage files and source hashes are in the same report folder. `generate-report.py` regenerates the PDF using Python and ReportLab (Arial on Windows or DejaVu Sans on Linux). Take new screenshots and refresh evidence after a new scan; the committed report describes the recorded snapshot.

## CI coverage and artifacts

The GitHub workflow runs frontend lint, coverage tests and production build; backend verification, JaCoCo coverage and formatting against its existing disposable PostgreSQL service; and root Sonar workflow guard tests. It uploads frontend coverage and backend reports/compiled analysis inputs as artifacts, including after a failed job when outputs exist.

GitHub Actions does not receive the local Sonar token, launch this desktop Sonar server or scan `localhost:9000`. Its PostgreSQL service remains disposable test infrastructure; the native-server choice concerns local SonarQube. Downloaded coverage artifacts describe their own CI source revision and must not be presented as coverage for unrelated local edits. A shared CI Sonar endpoint would require a separately authorized setup.

## Troubleshooting

| Symptom                                     | Check                                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Server cannot find Java or exits early      | `SONAR_JAVA_HOME` identifies the separate supported JDK; inspect the foreground server output and ZIP `logs` directory |
| Application build uses the wrong Java       | Project `JAVA_HOME` remains Java 17; do not replace it with Sonar's runtime                                            |
| Local coverage refuses the database         | Use loopback PostgreSQL and the disposable database name `stayora_test`; keep Neon out of tests                        |
| Angular coverage cannot launch Chrome       | Install/use Chrome or Chromium and configure `CHROME_BIN`                                                              |
| Scan reports missing inputs                 | Run `npm run sonar:coverage` successfully after the last source changes                                                |
| Authentication fails                        | Generate an appropriate local project analysis token and update only ignored `.env`                                    |
| Scanner exits nonzero after upload          | Check the quality gate and server task result; a gate failure is a real result to address                              |
| Server disk-space allocation blocks startup | Free space first; the documented low-disk flag is limited to a short local demonstration                               |

The recorded local scan passed the new-code gate, with 67.1% total coverage, reliability C and 44 open findings. Remaining findings are review work; the gate does not certify that the whole project is issue-free.
