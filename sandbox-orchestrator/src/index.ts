import express from 'express';
import Docker from 'dockerode';
import { z } from 'zod';
import * as tar from 'tar-stream';
import { Readable } from 'stream';

const app = express();
app.use(express.json());

const docker = new Docker();
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || 'dev-secret';
const MAX_CONCURRENT_SANDBOXES = 50;

let activeSandboxes = 0;

// Auth Middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ORCHESTRATOR_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Periodic Orphan Cleanup (Safety Net)
// Runs every 5 minutes. Kills any container older than 2 hours.
setInterval(async () => {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: ['simoffice.sandbox=true'] }
    });
    
    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    
    for (const c of containers) {
      const createdAt = parseInt(c.Labels['simoffice.created_at'] || '0', 10);
      if (createdAt > 0 && now - createdAt > TWO_HOURS_MS) {
        console.log(`[ORPHAN CLEANUP] Removing expired container ${c.Id}`);
        const container = docker.getContainer(c.Id);
        try {
          await container.remove({ force: true, v: true });
          if (activeSandboxes > 0) activeSandboxes--;
        } catch (e) {
          console.error(`Failed to cleanup container ${c.Id}`, e);
        }
      }
    }
  } catch (err) {
    console.error('Orphan cleanup failed', err);
  }
}, 5 * 60 * 1000);

const provisionSchema = z.object({
  image: z.enum(['node:22-alpine', 'node:18-alpine', 'alpine']),
  limits: z.object({
    cpuCores: z.number().positive(),
    memoryMb: z.number().positive(),
    wallClockTimeoutMs: z.number().positive()
  })
});

app.post('/provision', async (req, res) => {
  if (activeSandboxes >= MAX_CONCURRENT_SANDBOXES) {
    return res.status(429).json({ error: 'Max concurrent sandboxes reached' });
  }

  try {
    const { image, limits } = provisionSchema.parse(req.body);
    activeSandboxes++;

    const cpuQuota = Math.floor(limits.cpuCores * 100000);
    const memoryBytes = Math.floor(limits.memoryMb * 1024 * 1024);

    const container = await docker.createContainer({
      Image: image,
      Cmd: ['tail', '-f', '/dev/null'],
      HostConfig: {
        Runtime: process.env.DOCKER_RUNTIME || 'runsc',
        NetworkMode: 'none',
        Memory: memoryBytes,
        CpuPeriod: 100000,
        CpuQuota: cpuQuota,
      },
      Labels: {
        'simoffice.sandbox': 'true',
        'simoffice.created_at': Date.now().toString()
      }
    });

    await container.start();
    
    // Create workspace dir securely
    await runExecWithTimeout(container, ['mkdir', '-p', '/workspace'], 'root', 5000, '/');

    if (image.startsWith('node:')) {
      await runExecWithTimeout(container, ['chown', '-R', 'node:node', '/workspace'], 'root', 5000, '/');
    }

    res.json({ envId: container.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

function normalizePath(targetPath: string): string {
  if (targetPath.includes('..')) {
    throw new Error('Invalid path: directory traversal not allowed');
  }
  let normalized = targetPath;
  if (normalized.startsWith('/')) normalized = normalized.substring(1);
  return normalized;
}

app.post('/listFiles', async (req, res) => {
  const { envId } = req.body;
  if (!envId) return res.status(400).json({ error: 'Missing envId' });
  
  const container = docker.getContainer(envId);
  try {
    const result = await runExecWithTimeout(
      container,
      ['find', '.', '-type', 'f', '-not', '-path', '*/.git/*', '-not', '-path', '*/node_modules/*', '-print0'],
      'node',
      5000,
      '/workspace'
    );
    
    // Split by null byte to handle newlines in filenames safely
    const stdout = result.stdout;
    const paths = stdout.split('\0').filter(Boolean);
    const files = paths.map(p => ({
      path: p.replace(/^\.\//, ''),
      type: 'file'
    }));
    
    res.json({ files });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/readFile', async (req, res) => {
  const { envId, path } = req.body;
  if (!envId || !path) return res.status(400).json({ error: 'Missing envId or path' });

  const safePath = normalizePath(path);
  const container = docker.getContainer(envId);

  try {
    const archiveStream = await container.getArchive({ path: `/workspace/${safePath}` });
    const extract = tar.extract();
    
    let fileContent = '';
    
    extract.on('entry', (header, stream, next) => {
      stream.on('data', chunk => fileContent += chunk);
      stream.on('end', () => next());
      stream.resume();
    });

    archiveStream.pipe(extract);

    await new Promise((resolve, reject) => {
      extract.on('finish', resolve);
      extract.on('error', reject);
    });

    res.json({ content: fileContent });
  } catch (error: any) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/writeFile', async (req, res) => {
  const { envId, path, content } = req.body;
  if (!envId || !path) return res.status(400).json({ error: 'Missing envId or path' });

  const safePath = normalizePath(path);
  const container = docker.getContainer(envId);

  try {
    const pack = tar.pack();
    // Use uid/gid 1000 for 'node' user in alpine
    pack.entry({ name: safePath, uid: 1000, gid: 1000, mode: 0o644 }, content);
    pack.finalize();

    await container.putArchive(pack, { path: '/workspace' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function runExecWithTimeout(container: Docker.Container, cmd: string[], user: string, timeoutMs: number, workingDir?: string): Promise<{ stdout: string, stderr: string, exitCode: number, timedOut: boolean }> {
  const exec = await container.exec({
    Cmd: cmd,
    User: user,
    WorkingDir: workingDir || '/workspace',
    AttachStdout: true,
    AttachStderr: true
  });

  const stream = await exec.start({});
  
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    
    // dockerode streams multiplex stdout/stderr. We demux it.
    container.modem.demuxStream(stream, {
      write: (data: Buffer) => { stdout += data.toString(); }
    }, {
      write: (data: Buffer) => { stderr += data.toString(); }
    });

    let timedOut = false;
    const timer = setTimeout(async () => {
      timedOut = true;
      // Timeout reached. Kill the spawned process inside the container.
      // Since `docker exec` doesn't have an easy way to kill the specific process from the API,
      // we can exec another command to kill it, or use `timeout` inside the cmd itself.
      // Actually, passing `timeout ${seconds}s` directly in the Cmd is much cleaner and native.
      resolve({ stdout, stderr, exitCode: 124, timedOut: true }); // We will actually handle timeout within the container.
    }, timeoutMs + 1000); // safety buffer

    stream.on('end', async () => {
      clearTimeout(timer);
      if (timedOut) return;
      try {
        const inspect = await exec.inspect();
        resolve({ stdout, stderr, exitCode: inspect.ExitCode || 0, timedOut: false });
      } catch (err) {
        reject(err);
      }
    });
  });
}

app.post('/runCheck', async (req, res) => {
  const { envId, timeoutMs } = req.body;
  if (!envId) return res.status(400).json({ error: 'Missing envId' });
  const timeout = timeoutMs || 30000;
  const timeoutSeconds = Math.ceil(timeout / 1000);

  const container = docker.getContainer(envId);

  try {
    // Run npm run check, wrapped in timeout. The timeout command handles killing the process.
    const result = await runExecWithTimeout(
      container,
      ['sh', '-c', `timeout ${timeoutSeconds}s npm run check`],
      'node', // Run as student user
      timeout
    );
    
    // timeout command exits with 124 on timeout
    if (result.exitCode === 124) {
      result.timedOut = true;
    }
    
    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/runVerification', async (req, res) => {
  const { envId, harnessContent, timeoutMs } = req.body;
  if (!envId || !harnessContent) return res.status(400).json({ error: 'Missing envId or harnessContent' });
  const timeout = timeoutMs || 30000;
  const timeoutSeconds = Math.ceil(timeout / 1000);

  const container = docker.getContainer(envId);

  try {
    // 1. Create secure internal directory as root
    await runExecWithTimeout(container, ['sh', '-c', 'mkdir -p /internal_harness && chmod 700 /internal_harness'], 'root', 5000, '/');

    // 2. Inject harness
    const pack = tar.pack();
    pack.entry({ name: 'harness.js', uid: 0, gid: 0, mode: 0o700 }, harnessContent);
    pack.finalize();
    await container.putArchive(pack, { path: '/internal_harness' });

    // 3. Execute harness securely as root
    const result = await runExecWithTimeout(
      container,
      ['sh', '-c', `timeout ${timeoutSeconds}s node /internal_harness/harness.js`],
      'root',
      timeout
    );
    
    if (result.exitCode === 124) result.timedOut = true;

    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    // 4. Guaranteed cleanup
    try {
      const rmExec = await container.exec({ Cmd: ['rm', '-rf', '/internal_harness'], User: 'root' });
      await rmExec.start({});
    } catch (cleanupError) {
      console.error(`Failed to cleanup harness for env ${envId}`, cleanupError);
    }
  }
});

app.delete('/teardown', async (req, res) => {
  const { envId } = req.body;
  if (!envId) return res.status(400).json({ error: 'Missing envId' });

  const container = docker.getContainer(envId);
  try {
    await container.remove({ force: true, v: true });
    if (activeSandboxes > 0) activeSandboxes--;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Sandbox Orchestrator listening on port ${PORT}`);
});
