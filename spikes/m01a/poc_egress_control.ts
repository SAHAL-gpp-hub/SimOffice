import { Sandbox } from 'e2b';

async function main() {
  console.log('--- E2B Egress Control PoC ---');
  
  if (!process.env.E2B_API_KEY) {
    console.error('Error: E2B_API_KEY environment variable is missing.');
    process.exit(1);
  }

  let sandbox: Sandbox | null = null;
  
  try {
    console.log('Provisioning E2B sandbox...');
    sandbox = await Sandbox.create();
    console.log(`Sandbox provisioned (ID: ${sandbox.id})`);

    // Attempt to ping an external host (example.com)
    console.log('\nTesting outbound network access (curl http://example.com)...');
    
    // We use a short timeout (-m 5) so it doesn't hang forever if packets are dropped
    const result = await sandbox.commands.run('curl -v -m 5 http://example.com');
    
    console.log(`\nCommand Exit Code: ${result.exitCode}`);
    console.log(`Command Stdout:\n${result.stdout}`);
    
    if (result.stderr) {
      console.log(`Command Stderr:\n${result.stderr}`);
    }

    // Evaluate Pass/Fail
    if (result.exitCode === 0) {
      console.error('\n[FAIL] Egress control failed: The sandbox successfully reached the external host.');
      console.error('Since this is the free tier of E2B, if it cannot be blocked natively, E2B fails the security requirements.');
    } else {
      console.log(`\n[PASS] Egress control passed: The sandbox could not reach the external host (Exit Code: ${result.exitCode}).`);
    }

  } catch (error) {
    console.error('\nAn error occurred during the PoC execution:', error);
  } finally {
    if (sandbox) {
      console.log('\nTearing down sandbox...');
      await sandbox.kill();
      console.log('Sandbox torn down.');
    }
  }
}

main().catch(console.error);
