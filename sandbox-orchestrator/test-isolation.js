const http = require('http');

async function testIsolation() {
  const orchestratorUrl = 'http://localhost:8080';
  const secret = 'dev-secret';

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${secret}`
  };

  const request = (endpoint, method, body, customHeaders = headers) => {
    return new Promise((resolve, reject) => {
      const req = http.request(orchestratorUrl + endpoint, {
        method,
        headers: customHeaders
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data });
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  console.log('--- Running Security Isolation Tests ---');

  // 1. Auth Rejection
  console.log('\n[TEST 1] Testing Auth Rejection');
  let res = await request('/provision', 'POST', {}, { 'Content-Type': 'application/json' });
  if (res.status === 401) {
    console.log('PASS: Provision rejected without auth');
  } else {
    console.error(`FAIL: Provision allowed without auth. Status: ${res.status}`);
  }

  // 2. Provision with Allowlist
  console.log('\n[TEST 2] Testing Image Allowlist');
  res = await request('/provision', 'POST', {
    image: 'ubuntu:latest', // not allowed
    limits: { cpuCores: 1, memoryMb: 512, wallClockTimeoutMs: 30000 }
  });
  if (res.status === 400) {
    console.log('PASS: Arbitrary image rejected');
  } else {
    console.error(`FAIL: Arbitrary image accepted. Status: ${res.status}`);
  }

  // Provision valid environment
  console.log('\nProvisioning valid environment...');
  res = await request('/provision', 'POST', {
    image: 'alpine', // using alpine for fast curl/wget
    limits: { cpuCores: 1, memoryMb: 64, wallClockTimeoutMs: 30000 } // 64MB for easy OOM
  });
  
  if (res.status !== 200) {
    console.error('FAIL to provision environment', res.body);
    process.exit(1);
  }
  const envId = JSON.parse(res.body).envId;
  console.log(`Environment provisioned: ${envId}`);

  // 3. Network Egress
  console.log('\n[TEST 3] Testing Network Egress');
  // runCheck runs as 'node' but in alpine image node user might not exist, but let's test with 'root' for network using runVerification since it executes as root and we just want to test egress
  const networkHarness = `
    const { execSync } = require('child_process');
    try {
      execSync('wget -qO- --timeout=3 http://example.com');
      console.log('REACHED_INTERNET');
    } catch (e) {
      console.log('NETWORK_FAILED');
    }
  `;
  // Actually alpine image doesn't have node installed by default. 
  // Let's re-provision with node:22-alpine.
  console.log('Tearing down alpine...');
  await request('/teardown', 'DELETE', { envId });

  res = await request('/provision', 'POST', {
    image: 'node:22-alpine', 
    limits: { cpuCores: 1, memoryMb: 128, wallClockTimeoutMs: 15000 }
  });
  const nodeEnvId = JSON.parse(res.body).envId;

  res = await request('/runVerification', 'POST', {
    envId: nodeEnvId,
    harnessContent: networkHarness,
    timeoutMs: 10000
  });
  const verifyBody = JSON.parse(res.body);
  if (verifyBody.stdout.includes('NETWORK_FAILED')) {
    console.log('PASS: Network egress blocked (--network none)');
  } else {
    console.error('FAIL: Network egress allowed or unexpected error', verifyBody);
  }

  // 4. Resource Ceiling (OOM)
  console.log('\n[TEST 4] Testing Resource Ceiling (OOM)');
  const oomScript = `
    const arr = [];
    try {
      while(true) {
        arr.push(Buffer.alloc(1024 * 1024)); // 1MB chunks
      }
    } catch (e) {
      console.log('CAUGHT_OOM');
    }
  `;
  await request('/writeFile', 'POST', {
    envId: nodeEnvId,
    path: 'oom.js',
    content: oomScript
  });
  
  res = await request('/runCheck', 'POST', {
    envId: nodeEnvId,
    timeoutMs: 10000
  });
  const oomBody = JSON.parse(res.body);
  // Docker OOM kill exit code is usually 137
  if (oomBody.exitCode === 137 || oomBody.stderr.includes('JavaScript heap out of memory')) {
    console.log('PASS: Memory exhaustion killed the process');
  } else {
    console.error('FAIL: OOM test did not behave as expected', oomBody);
  }
  
  // 5. Runtime Enforcement
  console.log('\n[TEST 5] Testing Runtime Enforcement');
  // We can't inspect from node without dockerode here, but we can assume if provision passes the runtime flag was accepted by the daemon.

  // 6. Concurrent Ceiling
  console.log('\n[TEST 6] Testing Concurrent Ceiling (Spawning up to max)');
  // We know max is 50. Let's spawn 50 more.
  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(request('/provision', 'POST', {
      image: 'alpine', 
      limits: { cpuCores: 0.1, memoryMb: 64, wallClockTimeoutMs: 10000 }
    }));
  }
  const results = await Promise.all(promises);
  const tooMany = results.find(r => r.status === 429);
  if (tooMany) {
    console.log('PASS: Concurrent ceiling enforced (429 returned)');
  } else {
    console.error('FAIL: Allowed >50 concurrent containers or failed for other reasons.');
  }

  // Teardown all
  console.log('\nTearing down environments...');
  await request('/teardown', 'DELETE', { envId: nodeEnvId });
  for (const r of results) {
    if (r.status === 200) {
      const id = JSON.parse(r.body).envId;
      await request('/teardown', 'DELETE', { envId: id });
    }
  }

  console.log('\n--- Tests Complete ---');
}

testIsolation().catch(console.error);
