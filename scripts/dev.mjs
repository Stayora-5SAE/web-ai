import concurrently from 'concurrently';
const { result } = concurrently(
  [
    { command: 'npm run dev:backend', name: 'api', prefixColor: 'green' },
    { command: 'npm run dev:frontend', name: 'web', prefixColor: 'cyan' },
  ],
  { killOthers: ['failure', 'success'] },
);
result.catch(() => {
  process.exitCode = 1;
});
