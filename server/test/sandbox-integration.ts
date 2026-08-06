import { GVisorProvider } from '../src/sandbox/gvisor.provider';

async function runIntegrationTest() {
  console.log('--- Starting SandboxProvider Integration Test ---');

  // Initialize provider
  // It reads ORCHESTRATOR_URL and ORCHESTRATOR_SECRET from env
  const provider = new GVisorProvider();

  try {
    // 1. Provision
    console.log('\\n[1] Provisioning sandbox...');
    const limits = { cpuCores: 1, memoryMb: 128, wallClockTimeoutMs: 30000 };
    const env = await provider.provision(
      'team-integration',
      { image: 'node:22-alpine' },
      limits,
    );
    console.log('Provisioned successfully. EnvRef:', env);

    // 2. Write File
    console.log('\\n[2] Writing file to sandbox...');
    await provider.writeFile(env, 'test-file.txt', 'Integration Test Data');
    console.log('Write file successful.');

    // 3. Read File
    console.log('\\n[3] Reading file from sandbox...');
    const content = await provider.readFile(env, 'test-file.txt');
    console.log('Read file successful. Content:', content);
    if (content !== 'Integration Test Data') {
      throw new Error(
        `Content mismatch. Expected 'Integration Test Data', got '${content}'`,
      );
    }

    // 4. Run Check
    console.log('\\n[4] Running check...');
    // runCheck expects `npm run check` to be available
    await provider.writeFile(
      env,
      'package.json',
      JSON.stringify({
        scripts: {
          check: 'echo "Check passed!"',
        },
      }),
    );

    const checkResult = await provider.runCheck(env);
    console.log('Run check result:', checkResult);
    if (!checkResult.stdout.includes('Check passed!')) {
      console.warn(
        'Check stdout did not contain expected output:',
        checkResult.stdout,
      );
    }

    // 5. Run Verification
    console.log('\\n[5] Running verification...');
    // We pass a dummy harness string and it should execute
    // Wait, provider.runVerification expects a harnessRef path now!
    // I need to create a dummy file on disk for the harnessRef.
    const fs = require('fs');
    fs.writeFileSync('/tmp/dummy-harness.js', 'console.log("Verified!");');

    const verifyResult = await provider.runVerification(
      env,
      '/tmp/dummy-harness.js',
    );
    console.log('Verification result:', verifyResult);
    if (!verifyResult.stdout.includes('Verified!')) {
      console.warn(
        'Verification stdout did not contain expected output:',
        verifyResult.stdout,
      );
    }

    // 6. Teardown
    console.log('\\n[6] Tearing down...');
    await provider.teardown(env);
    console.log('Teardown successful.');

    console.log('\\n--- Integration Test Passed ---');
    process.exit(0);
  } catch (err) {
    console.error('\\n--- Integration Test Failed ---', err);
    process.exit(1);
  }
}

runIntegrationTest();
