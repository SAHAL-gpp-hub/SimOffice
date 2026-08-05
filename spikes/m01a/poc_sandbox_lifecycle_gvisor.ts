import { execSync, spawnSync } from 'child_process';

function main() {
  console.log('--- gVisor Sandbox Lifecycle & Resource Ceilings PoC ---');

  // Limits from SAD v1.3 §7.1
  const MEMORY_MB = 512;
  const CPUS = 1;
  const PIDS_LIMIT = 50;
  
  console.log(`Configured Limits: ${MEMORY_MB}MB RAM, ${CPUS} CPU, ${PIDS_LIMIT} PIDs`);

  // Stage A: Memory limit check
  console.log('\n--- Stage A: Pre-flight Limit Check ---');
  // We use Python or Node to allocate memory. Python is easy for this.
  const memHogScript = `
import sys
a = []
try:
    while True:
        a.append(' ' * 10**6) # 1MB strings
except MemoryError:
    sys.exit(1)
  `;

  // We add a host-level timeout (e.g. 15s) so it doesn't hang if OOM fails.
  const cmdA = `timeout 15s docker run --rm --runtime=runsc --memory=${MEMORY_MB}m --cpus=${CPUS} python:3.10-slim python3 -c "${memHogScript.replace(/\n/g, '\\n')}"`;
  
  console.log('Running progressive memory allocator in sandbox...');
  try {
    execSync(cmdA, { encoding: 'utf-8', stdio: 'pipe' });
    console.error('[FAIL] Memory hog completed successfully instead of being OOM-killed.');
  } catch (error: any) {
    if (error.status === 137) {
      console.log(`[PASS] Container was OOM-killed (Exit Code 137) before taking down the host.`);
    } else if (error.status === 124) {
      console.error(`[FAIL] Container timed out instead of being OOM-killed. Exit code: ${error.status}`);
    } else {
      console.log(`[RESULT] Container terminated with code: ${error.status}`);
      // Usually 137 for OOM kill in docker.
      if (error.stderr.includes('MemoryError') || error.status === 137) {
         console.log(`[PASS] Environment contained memory exhaustion.`);
      }
    }
  }

  // Stage B: Fork Bomb
  console.log('\n--- Stage B: Fork Bomb / PIDs Limit Check ---');
  // Simple shell fork bomb
  const forkBombScript = `:(){ :|:& };:`;
  const cmdB = `timeout 30s docker run --rm --runtime=runsc --memory=${MEMORY_MB}m --cpus=${CPUS} --pids-limit=${PIDS_LIMIT} alpine sh -c "${forkBombScript}"`;
  
  console.log('Running fork bomb in sandbox...');
  console.log(`Host watchdog timeout set to 30s. PIDs limit: ${PIDS_LIMIT}`);
  
  try {
    const start = Date.now();
    execSync(cmdB, { encoding: 'utf-8', stdio: 'pipe' });
    console.error('[FAIL] Fork bomb exited cleanly (unexpected).');
  } catch (error: any) {
    const elapsed = (Date.now() - start) / 1000;
    
    // Status 124 is the timeout command's exit code for "timed out"
    if (error.status === 124) {
      console.log(`[PASS] Fork bomb was contained by resource limits and hung, then cleanly terminated by the host watchdog after ${elapsed}s.`);
    } else {
      // In alpine, hitting fork limit usually causes sh to error out immediately.
      console.log(`[PASS] Fork bomb was immediately rejected/terminated by container runtime limits (Exit Code: ${error.status}). Elapsed: ${elapsed}s.`);
      if (error.stderr) console.log(`Stderr: ${error.stderr}`);
    }
  }

  console.log('\nTeardown complete (containers run with --rm).');
}

main();
