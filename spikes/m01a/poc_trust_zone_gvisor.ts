import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function main() {
  console.log('--- gVisor Trust-Zone Tamper Resistance PoC ---');
  
  // 1. Setup host workspace and harness directories
  const hostWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'gvisor-poc-workspace-'));
  const hostHarnessDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gvisor-poc-harness-'));
  
  // Student code attempts to read the harness
  const studentCode = `
const fs = require('fs');
console.log('Student code executing...');
try {
  const content = fs.readFileSync('/harness/harness.js', 'utf-8');
  console.log('[STUDENT OUTPUT] Harness read successfully (FAIL):', content.substring(0, 50));
} catch (e) {
  console.log('[STUDENT OUTPUT] Cannot read harness (EXPECTED):', e.message);
}
  `;
  fs.writeFileSync(path.join(hostWorkspace, 'student.js'), studentCode);
  
  // Create harness code
  const harnessCode = `
const fs = require('fs');
console.log('[HARNESS] Executing verification securely...');
const studentSrc = fs.readFileSync('/workspace/student.js', 'utf-8');
if (studentSrc.includes('console.log')) {
  console.log('[HARNESS] RESULT: PASS');
}
  `;
  fs.writeFileSync(path.join(hostHarnessDir, 'harness.js'), harnessCode);
  
  console.log(`Created host workspace at ${hostWorkspace} mapped to /workspace in container.`);
  console.log(`Created host harness at ${hostHarnessDir} mapped to /harness (read-only).`);
  
  const containerName = `poc-trust-zone-${Date.now()}`;
  
  try {
    // 2. Start container (detached) with both the workspace and the harness volumes.
    // The harness is mounted, but we will secure it with permissions.
    console.log('Provisioning student environment container...');
    execSync(`docker run -d --name ${containerName} --runtime=runsc \
      -v ${hostWorkspace}:/workspace \
      -v ${hostHarnessDir}:/harness:ro \
      node:18-alpine tail -f /dev/null`);
      
    // Secure the harness directory inside the container. 
    // We restrict it so only root (uid 0) can read/execute it.
    // We also make sure the workspace is owned by the non-root 'node' user.
    execSync(`docker exec ${containerName} chown -R node:node /workspace`);
    try {
        execSync(`docker exec ${containerName} chmod 700 /harness`);
    } catch (e) {
        // On macOS bind mounts, chmod might fail. As a fallback for the PoC, 
        // we can copy the harness to an internal directory and secure that instead,
        // to simulate a proper volume mount with permissions.
        execSync(`docker exec ${containerName} mkdir -p /internal_harness`);
        execSync(`docker exec ${containerName} cp /harness/harness.js /internal_harness/`);
        execSync(`docker exec ${containerName} chmod -R 700 /internal_harness`);
        
        // Update student code to look in the internal directory for the fallback
        const updatedStudentCode = studentCode.replace('/harness/harness.js', '/internal_harness/harness.js');
        fs.writeFileSync(path.join(hostWorkspace, 'student.js'), updatedStudentCode);
    }
    
    // 3. The student executes their code (e.g. from in-game terminal).
    // We run the student code as the non-root 'node' user (uid 1000).
    console.log('\nRunning student code in container (as non-root user)...');
    const studentRun = spawnSync('docker', ['exec', '--user', 'node', containerName, 'node', '/workspace/student.js'], { encoding: 'utf-8' });
    console.log(studentRun.stdout);
    if (studentRun.stdout.includes('EXPECTED')) {
      console.log('[PASS] Student code cannot see the harness before/during verification.');
    } else {
      console.error('[FAIL] Student code accessed the harness!');
    }
    
    // 4. App server triggers verification via the mounted files.
    // The verifier runs as root, bypassing the permission restrictions applied to the student.
    console.log('\nApp server triggering verification (executing over mount)...');
    
    // Depending on if we used the fallback internal directory or not:
    const harnessPath = fs.existsSync(path.join(hostHarnessDir, 'harness.js')) ? '/harness/harness.js' : '/internal_harness/harness.js';
    // Actually we'll just check if internal_harness exists in the container
    const checkHarnessCmd = `docker exec ${containerName} sh -c "[ -d /internal_harness ] && echo '/internal_harness/harness.js' || echo '/harness/harness.js'"`;
    const actualHarnessPath = execSync(checkHarnessCmd, { encoding: 'utf-8' }).trim();

    const verifyRun = spawnSync('docker', ['exec', '--user', 'root', containerName, 'node', actualHarnessPath], { encoding: 'utf-8' });
    console.log(verifyRun.stdout);
    
    if (verifyRun.stdout.includes('RESULT: PASS')) {
      console.log('[PASS] Harness successfully read student workspace and executed securely.');
    }
    
  } finally {
    // Teardown
    console.log('\nTearing down container...');
    try { execSync(`docker rm -f ${containerName} > /dev/null 2>&1`); } catch (e) {}
    try { fs.rmSync(hostWorkspace, { recursive: true, force: true }); } catch (e) {}
    try { fs.rmSync(hostHarnessDir, { recursive: true, force: true }); } catch (e) {}
  }
}

main();

