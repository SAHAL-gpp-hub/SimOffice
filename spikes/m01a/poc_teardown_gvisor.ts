import { execSync, spawnSync } from 'child_process';

function main() {
  console.log('--- gVisor Teardown Data-Leak Check PoC ---');
  
  // In a real environment, we'd either mount an ephemeral volume or rely on the container's overlay fs.
  // We simulate relying on the container overlay fs here.
  
  const containerA = `poc-teardown-A-${Date.now()}`;
  const containerB = `poc-teardown-B-${Date.now()}`;
  
  try {
    console.log(`Provisioning Sandbox A (${containerA})...`);
    execSync(`docker run -d --name ${containerA} --runtime=runsc alpine tail -f /dev/null`);
    
    console.log('Writing secret file to Sandbox A...');
    execSync(`docker exec ${containerA} sh -c "echo 'TOP_SECRET_DATA' > /workspace_secret.txt"`);
    
    console.log('Tearing down Sandbox A...');
    execSync(`docker rm -f ${containerA}`);
    
    console.log(`\nProvisioning Sandbox B (${containerB})...`);
    execSync(`docker run -d --name ${containerB} --runtime=runsc alpine tail -f /dev/null`);
    
    console.log('Attempting to read secret file from Sandbox B...');
    const readAttempt = spawnSync('docker', ['exec', containerB, 'cat', '/workspace_secret.txt'], { encoding: 'utf-8' });
    
    if (readAttempt.status !== 0 && readAttempt.stderr.includes('No such file')) {
      console.log('[PASS] Sandbox B started clean. No data leaked from Sandbox A.');
    } else {
      console.error('[FAIL] Sandbox B was able to access data from Sandbox A!');
      console.error(`Output: ${readAttempt.stdout}`);
    }
    
  } finally {
    console.log('\nTearing down Sandbox B...');
    try { execSync(`docker rm -f ${containerB} > /dev/null 2>&1`); } catch (e) {}
  }
}

main();
