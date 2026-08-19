const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function getWsUrl(port) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.webSocketDebuggerUrl) {
              clearInterval(interval);
              resolve(json.webSocketDebuggerUrl);
            }
          } catch (e) {}
        });
      }).on('error', () => {
        if (attempts > 30) {
          clearInterval(interval);
          reject(new Error('Timed out waiting for Chrome debugger'));
        }
      });
    }, 200);
  });
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const htmlPath = path.resolve(__dirname, '../docs/PRD_Pizza_Expert_Prayagraj.html');
  const outputPath = path.resolve(__dirname, '../Pizza_Expert_Prayagraj_PRD.pdf');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  console.log('Generating PRD PDF from:', fileUrl);
  console.log('Target PDF path:', outputPath);

  const port = 9333;
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    console.log('Connected to Chrome DevTools Protocol:', wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.onopen = resolve);

    let id = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (event) => {
          const res = JSON.parse(event.data);
          if (res.id === msgId) {
            ws.removeEventListener('message', handler);
            resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    // 1. Create target / navigate
    const target = await sendCommand('Target.createTarget', { url: fileUrl });
    const targetId = target.targetId;

    // Connect to specific page target
    const pageWsUrl = `ws://127.0.0.1:${port}/devtools/page/${targetId}`;
    const pageWs = new WebSocket(pageWsUrl);
    await new Promise((resolve) => pageWs.onopen = resolve);

    function sendPageCommand(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (event) => {
          const res = JSON.parse(event.data);
          if (res.id === msgId) {
            pageWs.removeEventListener('message', handler);
            resolve(res.result);
          }
        };
        pageWs.addEventListener('message', handler);
        pageWs.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await sendPageCommand('Page.enable');
    await sendPageCommand('Page.navigate', { url: fileUrl });

    // Wait for page load
    await new Promise((r) => setTimeout(r, 1500));

    console.log('Rendering PDF via Chrome Page.printToPDF...');
    const pdfData = await sendPageCommand('Page.printToPDF', {
      printBackground: true,
      preferCSSPageSize: true,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      paperWidth: 8.27, // A4
      paperHeight: 11.69,
    });

    if (pdfData && pdfData.data) {
      const buffer = Buffer.from(pdfData.data, 'base64');
      fs.writeFileSync(outputPath, buffer);
      console.log(`✅ Success! High-Quality PRD PDF generated: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    } else {
      console.error('Failed to generate PDF buffer:', pdfData);
    }

    pageWs.close();
    ws.close();
  } finally {
    chromeProcess.kill();
  }
}

run().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
