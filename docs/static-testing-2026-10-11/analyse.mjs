// Collecteur local en lecture seule : aucun lancement de l'application, test ou correctif.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '../..');
const frontend = path.join(racine, 'frontend');
const argument = process.argv.indexOf('--output');
const sortie = argument < 0 ? ici : path.resolve(racine, process.argv[argument + 1]);
mkdirSync(sortie, { recursive: true });
if (existsSync(path.join(sortie, 'execution.json')))
  throw new Error('Dossier déjà utilisé : choisir un nouveau dossier de sortie.');
const sauver = (nom, contenu) => writeFileSync(path.join(sortie, nom), contenu, { flag: 'wx' });
const json = (nom, valeur) => sauver(nom, JSON.stringify(valeur, null, 2) + '\n');
const zone = 'Etc/GMT-1';
const local = () =>
  new Date().toLocaleString('sv-SE', { timeZone: zone, hour12: false }) + ' UTC+01:00';
const git = (...args) => {
  const r = spawnSync('git', args, { cwd: racine, encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw new Error('Lecture Git impossible.');
  return r.stdout;
};
const inventaire = () =>
  git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
    .split('\0')
    .filter((n) => n && !n.startsWith('docs/static-testing-2026-10-11/'))
    .sort()
    .map((n) => ({
      fichier: n,
      sha256: createHash('sha256')
        .update(readFileSync(path.join(racine, n)))
        .digest('hex'),
    }));
const parcours = (dossier) =>
  readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const nom = path.join(dossier, e.name);
    return e.isDirectory() ? parcours(nom) : /\.(ts|html)$/.test(nom) ? [nom] : [];
  });
const cibles = parcours(path.join(frontend, 'src'))
  .sort()
  .map((n) => ({
    fichier: path.relative(racine, n).replaceAll('\\', '/'),
    lignes: readFileSync(n, 'utf8').split(/\r?\n/).length,
  }));
json('fichiers-cibles.json', cibles);
json('integrite-avant.json', inventaire());
sauver('git-avant.txt', git('status', '--porcelain=v1'));
const commandes = [];
const eslint = path.join(frontend, 'node_modules/eslint/bin/eslint.js');
const config = path.join(ici, 'eslint-rapport.cjs');
const commun = ['--config', config, '--resolve-plugins-relative-to', frontend];
function executer(nom, args, extension = 'txt') {
  const debut = new Date().toISOString();
  const debutLocal = local();
  const t = performance.now();
  const r = spawnSync(process.execPath, args, {
    cwd: frontend,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, TZ: zone },
  });
  const duree = performance.now() - t;
  sauver(nom + '-stdout.' + extension, r.stdout ?? '');
  sauver(nom + '-stderr.txt', r.stderr ?? '');
  commandes.push({
    nom,
    executable: process.execPath,
    arguments: args,
    commandePowerShell:
      '& ' + [process.execPath, ...args].map((s) => "'" + s.replaceAll("'", "''") + "'").join(' '),
    dossier: frontend,
    debutUTC: debut,
    debutLocal,
    finUTC: new Date().toISOString(),
    fuseau: zone,
    dureeSecondes: Number((duree / 1000).toFixed(3)),
    codeSortie: r.status,
    signal: r.signal,
    erreurLancement: r.error?.message ?? null,
  });
  return r;
}
executer('version-node', ['--version']);
executer('version-eslint', [eslint, '--version']);
executer(
  'configuration-typescript',
  [eslint, ...commun, '--print-config', 'src/app/app.component.ts'],
  'json',
);
executer('configuration-html', [eslint, ...commun, '--print-config', 'src/index.html'], 'json');
const analyse = executer(
  'analyse',
  [
    eslint,
    ...commun,
    '--ext',
    '.ts,.html',
    '--format',
    'json',
    '--report-unused-disable-directives',
    'src',
  ],
  'json',
);
const apres = inventaire();
json('integrite-apres.json', apres);
sauver('git-apres.txt', git('status', '--porcelain=v1'));
const avant = JSON.parse(readFileSync(path.join(sortie, 'integrite-avant.json'), 'utf8'));
const identique = JSON.stringify(avant) === JSON.stringify(apres);
const resultats = JSON.parse(analyse.stdout);
const total = (champ) => resultats.reduce((s, f) => s + f[champ], 0);
const observations = resultats.flatMap((f) =>
  f.messages.map((m) => ({
    fichier: path.relative(racine, f.filePath).replaceAll('\\', '/'),
    ...m,
  })),
);
const statistiques = {
  fichiersCibles: cibles.length,
  fichiersAnalyses: resultats.length,
  fichiersAvecConstats: resultats.filter((f) => f.messages.length).length,
  lignesPhysiquesCiblees: cibles.reduce((s, f) => s + f.lignes, 0),
  erreurs: total('errorCount'),
  avertissements: total('warningCount'),
  fatales: total('fatalErrorCount'),
  fichiersPreserves: apres.length,
  integriteIdentique: identique,
  regles: Object.fromEntries(
    [...new Set(observations.map((m) => m.ruleId))].map((r) => [
      r,
      observations.filter((m) => m.ruleId === r).length,
    ]),
  ),
  observations,
};
json('execution.json', {
  projet: racine,
  commit: git('rev-parse', 'HEAD').trim(),
  node: process.version,
  plateforme: process.platform,
  fuseau: zone,
  commandes,
  statistiques,
});
console.log(JSON.stringify({ ...statistiques, observations: undefined }, null, 2));
if (!identique) throw new Error('Le contenu préexistant a changé pendant la collecte.');
process.exitCode = analyse.status ?? 2;
