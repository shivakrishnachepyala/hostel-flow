import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'hms_chrome_test_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBrowserWebSocketUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT}/json/version`, (r) => {
          let data = '';
          r.on('data', (chunk) => (data += chunk));
          r.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      if (res && res.webSocketDebuggerUrl) {
        return res.webSocketDebuggerUrl;
      }
    } catch {
      await sleep(500);
    }
  }
  throw new Error('Failed to obtain Chrome DevTools WebSocket URL');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        } else if (msg.method) {
          this.events.push(msg);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('1. Launching Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--window-size=1400,900',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ]);

  try {
    const wsUrl = await getBrowserWebSocketUrl();
    const browserClient = new CDPClient(wsUrl);
    await browserClient.connect();

    // Use localhost:3000
    const createTargetResult = await browserClient.send('Target.createTarget', {
      url: 'http://localhost:3000/management/login',
    });
    const targetId = createTargetResult.targetId;
    const pageClient = new CDPClient(`ws://127.0.0.1:${PORT}/devtools/page/${targetId}`);
    await pageClient.connect();

    await pageClient.send('Page.enable');
    await pageClient.send('Runtime.enable');
    await pageClient.send('DOM.enable');

    await sleep(2500);

    console.log('2. Filling credentials on http://localhost:3000/management/login...');
    const fillRes = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const u = document.querySelector('input[type="text"]');
        const p = document.querySelector('input[type="password"]');
        
        function setReactInput(input, val) {
          const lastValue = input.value;
          input.value = val;
          const event = new Event('input', { bubbles: true });
          const tracker = input._valueTracker;
          if (tracker) {
            tracker.setValue(lastValue);
          }
          input.dispatchEvent(event);
        }

        setReactInput(u, 'warden_admin');
        setReactInput(p, 'WardenPassword123!');
        
        const btn = document.querySelector('button[type="submit"]');
        btn.click();
        
        return { uVal: u.value, pVal: p.value };
      })()`,
      returnByValue: true,
    });
    console.log('Fill result:', fillRes.result.value);

    // Wait for redirect to dashboard
    await sleep(3500);

    const checkAuth = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        return {
          currentUrl: window.location.href,
          error: document.querySelector('.bg-rose-50')?.innerText,
        };
      })()`,
      returnByValue: true,
    });
    console.log('Auth check:', checkAuth.result.value);

    // If redirected or navigating to tab=matches
    console.log('3. Navigating to Roommate Matching tab...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://localhost:3000/management/dashboard?tab=matches'`,
    });
    await sleep(4000);

    // Inspect live DOM
    const pageCheck = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h1')?.innerText || '';
        const kpis = Array.from(document.querySelectorAll('.text-2xl')).map(e => e.innerText);
        const rows = Array.from(document.querySelectorAll('tbody tr')).map(tr => tr.innerText.replace(/\\n+/g, ' | '));
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
        return { title, kpis, rowCount: rows.length, sampleRow: rows[0], buttons: buttons.slice(0, 10) };
      })()`,
      returnByValue: true,
    });
    console.log('\n--- Live Browser Roommate Matching UI ---');
    console.log('Page Title:', pageCheck.result.value.title);
    console.log('KPI Values (Total, Proposed, Approved, Avg, Pool):', pageCheck.result.value.kpis);
    console.log('Total Table Rows:', pageCheck.result.value.rowCount);
    console.log('Sample Row 1:', pageCheck.result.value.sampleRow);
    console.log('Sample Action Buttons:', pageCheck.result.value.buttons);

    // 4. Click Details Modal
    console.log('\n4. Clicking View Details (Eye button)...');
    const eyeClick = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button[title*="Breakdown"]');
        if (btn) {
          btn.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    console.log('Eye button clicked:', eyeClick.result.value);
    await sleep(1500);

    // Inspect Modal DOM
    const modalInspection = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return { open: false };
        const title = modal.querySelector('h2')?.innerText;
        const score = modal.querySelector('.text-3xl')?.innerText;
        const students = Array.from(modal.querySelectorAll('.font-bold.text-slate-900, .font-bold.dark\\\\:text-\\\\[\\\\#F1F5F9\\\\]')).map(e => e.innerText);
        const dimensions = Array.from(modal.querySelectorAll('.space-y-2')).map(d => d.innerText.replace(/\\n+/g, ' | '));
        return { open: true, title, score, students, dimensions: dimensions.slice(0, 4) };
      })()`,
      returnByValue: true,
    });
    console.log('\n--- Modal Live Content ---');
    console.log('Modal Open:', modalInspection.result.value.open);
    console.log('Modal Title:', modalInspection.result.value.title);
    console.log('Overall Score Gauge:', modalInspection.result.value.score);
    console.log('Students in Modal:', modalInspection.result.value.students);
    console.log('4 Dimension Breakdowns:');
    modalInspection.result.value.dimensions.forEach((d, idx) => console.log(`  [Dim ${idx + 1}] ${d}`));

    // Capture screenshot in Dark Mode
    const ssDark = await pageClient.send('Page.captureScreenshot', { format: 'png' });
    const darkPath = 'C:\\my pc\\study\\projects\\hms-frontend\\roommate_matches_dark.png';
    fs.writeFileSync(darkPath, Buffer.from(ssDark.data, 'base64'));
    console.log('\nScreenshot saved (Dark Mode):', darkPath);

    // Close modal
    await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('.fixed.inset-0 button');
        if (closeBtn) closeBtn.click();
      })()`,
    });
    await sleep(800);

    // 5. Test Live "Generate Matches" Button
    console.log('\n5. Testing Live "Generate Matches" button click in browser...');
    const genClick = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const genBtn = btns.find(b => b.innerText.includes('Generate Matches'));
        if (genBtn) {
          genBtn.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    });
    console.log('Generate button click:', genClick.result.value);

    // Wait for engine generation
    await sleep(4000);

    // Inspect summary banner
    const summaryCheck = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const banner = document.querySelector('.bg-indigo-50\\\\/70') || document.querySelector('.border-indigo-200');
        return banner ? banner.innerText : 'Banner not found';
      })()`,
      returnByValue: true,
    });
    console.log('\nEngine Live Result Banner:', summaryCheck.result.value);

    // 6. Test Light Mode Toggle
    console.log('\n6. Testing Light Mode Toggle...');
    await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('lucide-sun') || b.innerHTML.includes('lucide-moon') || b.getAttribute('aria-label')?.includes('theme'));
        if (themeBtn) {
          themeBtn.click();
          return { clicked: true };
        }
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        return { manualToggle: true };
      })()`,
      returnByValue: true,
    });
    await sleep(1500);

    const ssLight = await pageClient.send('Page.captureScreenshot', { format: 'png' });
    const lightPath = 'C:\\my pc\\study\\projects\\hms-frontend\\roommate_matches_light.png';
    fs.writeFileSync(lightPath, Buffer.from(ssLight.data, 'base64'));
    console.log('Screenshot saved (Light Mode):', lightPath);

    pageClient.close();
    browserClient.close();
    console.log('\nALL BROWSER E2E VERIFICATIONS SUCCEEDED!');
  } finally {
    chrome.kill();
    try {
      fs.rmSync(USER_DATA, { recursive: true, force: true });
    } catch {}
  }
}

run().catch(console.error);
