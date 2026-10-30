const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const dataDir = mkdtempSync(path.join(tmpdir(), 'upwise-tests-'));
try {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', 'src/tests/*.test.ts'], {
    cwd: path.resolve(__dirname, '..'), stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', UPWISE_DATA_DIR: dataDir,
      JWT_SECRET: randomBytes(48).toString('hex'), SEED_DEMO_USERS: 'true',
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/upwise?connect_timeout=1',
      GEMINI_API_KEY: '', TAVILY_API_KEY: '' },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally { rmSync(dataDir, { recursive: true, force: true }); }
