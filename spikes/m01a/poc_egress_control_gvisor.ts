import { execSync } from 'child_process';

function main() {
  console.log('--- gVisor Egress Control PoC ---');
  
  // We use Docker's native `--network none` or internal networks to isolate.
  // For the strictest egress control, `--network none` provides only a loopback interface.
  // If internal services are needed (e.g. database), a custom docker network without default gateway would be used.
  // Here we test `--network none` which is the maximum isolation baseline.
  
  const cmd = `docker run --rm --runtime=runsc --network=none alpine wget -qO- --timeout=5 http://example.com`;
  
  console.log('\nTesting outbound network access (wget http://example.com) with --network=none...');
  console.log(`Executing: ${cmd}\n`);
  
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`Command Output:\n${output}`);
    console.error('\n[FAIL] Egress control failed: The sandbox successfully reached the external host.');
  } catch (error: any) {
    console.log(`Command Exit Code: ${error.status}`);
    console.log(`Command Stderr:\n${error.stderr || error.message}`);
    
    // wget in alpine returns 1 on network failure like "bad address"
    if (error.status !== 0) {
      console.log('\n[PASS] Egress control passed: The sandbox network namespace has no route to the external host.');
    } else {
      console.error('\n[FAIL] Unexpected result.');
    }
  }
}

main();
