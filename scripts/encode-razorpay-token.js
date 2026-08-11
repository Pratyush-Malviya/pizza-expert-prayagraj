const fs = require('fs');
const path = require('path');

const keyId = process.argv[2];
const keySecret = process.argv[3];

if (!keyId || !keySecret) {
  console.log('\nUsage: node scripts/encode-razorpay-token.js <YOUR_KEY_ID> <YOUR_KEY_SECRET>\n');
  console.log('Example: node scripts/encode-razorpay-token.js rzp_test_abc123 secret_def456\n');
  process.exit(1);
}

const rawToken = `${keyId}:${keySecret}`;
const base64Token = Buffer.from(rawToken).toString('base64');

console.log('\n======================================================');
console.log('  RAZORPAY REMOTE MCP SERVER TOKEN GENERATOR');
console.log('======================================================');
console.log('  Key ID        :', keyId);
console.log('  Key Secret    :', '********' + keySecret.slice(-4));
console.log('  Merchant Token:', base64Token);
console.log('======================================================\n');

// Test connection to https://mcp.razorpay.com/mcp
console.log('Testing connection to https://mcp.razorpay.com/mcp ...');

fetch('https://mcp.razorpay.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${base64Token}`
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'RazorpayMCPClient', version: '1.0.0' }
    }
  })
})
.then(async (res) => {
  console.log(`\nConnection Test Status: ${res.status} ${res.statusText}`);
  if (res.status === 200 || res.status === 202) {
    console.log('✅ Successfully authenticated with Razorpay Remote MCP Server!\n');
  } else {
    const text = await res.text();
    console.log('Response Details:', text.slice(0, 300));
  }

  // Update mcp.json files
  const mcpFiles = [
    path.join(__dirname, '..', 'mcp.json'),
    path.join(__dirname, '..', '.vscode', 'mcp.json')
  ];

  mcpFiles.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/YOUR_BASE64_MERCHANT_TOKEN/g, base64Token);
        content = content.replace(/YOUR_RAZORPAY_KEY_ID/g, keyId);
        content = content.replace(/YOUR_RAZORPAY_KEY_SECRET/g, keySecret);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated configuration in ${path.relative(process.cwd(), filePath)}`);
      }
    } catch (err) {
      console.error(`Failed to update ${filePath}:`, err.message);
    }
  });

  console.log('\nSetup Complete! Restart your AI Assistant / IDE to activate Razorpay MCP tools.');
})
.catch((err) => {
  console.error('❌ Connection test error:', err.message);
});
