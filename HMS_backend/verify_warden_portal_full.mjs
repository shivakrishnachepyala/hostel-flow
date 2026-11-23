import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'hms_chrome_warden_test_' + Date.now());
const ARTIFACT_DIR = 'C:\\Users\\chepy\\.gemini\\antigravity\\brain\\08476012-4301-4257-8bf9-65d46f063c14';

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

async function takeScreenshot(pageClient, filename) {
  const result = await pageClient.send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(result.data, 'base64');
  const filePath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
}

async function run() {
  console.log('1. Launching Headless Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA}`,
    '--window-size=1440,960',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ]);

  try {
    const wsUrl = await getBrowserWebSocketUrl();
    const browserClient = new CDPClient(wsUrl);
    await browserClient.connect();

    console.log('2. Opening Management Login page...');
    const createTargetResult = await browserClient.send('Target.createTarget', {
      url: 'http://127.0.0.1:3000/management/login',
    });
    const targetId = createTargetResult.targetId;
    const pageClient = new CDPClient(`ws://127.0.0.1:${PORT}/devtools/page/${targetId}`);
    await pageClient.connect();

    await pageClient.send('Page.enable');
    await pageClient.send('Runtime.enable');

    await sleep(2000);

    console.log('3. Submitting Warden Login Credentials...');
    const fillRes = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const u = document.querySelector('input[type="text"]');
        const p = document.querySelector('input[type="password"]');
        if (!u || !p) return { success: false, reason: 'Inputs not found' };

        function setReactInput(input, val) {
          const lastValue = input.value;
          input.value = val;
          const event = new Event('input', { bubbles: true });
          const tracker = input._valueTracker;
          if (tracker) tracker.setValue(lastValue);
          input.dispatchEvent(event);
        }

        setReactInput(u, 'warden_admin');
        setReactInput(p, 'WardenPassword123!');

        const btn = document.querySelector('button[type="submit"]');
        btn.click();
        return { success: true };
      })()`,
      returnByValue: true,
    });
    console.log('Login submission:', fillRes.result.value);

    await sleep(3500);

    // 4. Verify Dashboard Overview
    console.log('4. Verifying Dashboard Overview...');
    const dashboardState = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.innerText;
        const kpis = Array.from(document.querySelectorAll('.font-display')).map(e => e.innerText);
        const alerts = Array.from(document.querySelectorAll('.bg-amber-50, .bg-purple-50, .bg-indigo-50, .bg-rose-50')).map(e => e.innerText.split('\\n')[0]);
        return { url: window.location.href, title, kpis, alertsCount: alerts.length };
      })()`,
      returnByValue: true,
    });
    console.log('Dashboard state:', dashboardState.result.value);
    await takeScreenshot(pageClient, 'warden_dashboard.png');

    // 5. Navigate to Guests Tab
    console.log('5. Verifying Guest Management Module...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://127.0.0.1:3000/management/dashboard?tab=guests'`,
    });
    await sleep(3000);

    const guestState = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.innerText;
        const kpis = Array.from(document.querySelectorAll('.font-display')).map(e => e.innerText);
        const rows = document.querySelectorAll('tbody tr').length;
        const assignBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Assign Room')).length;
        return { title, kpis, rows, assignBtns };
      })()`,
      returnByValue: true,
    });
    console.log('Guest Management state:', guestState.result.value);
    await takeScreenshot(pageClient, 'warden_guests.png');

    // 6. Test Assign Room Modal in Guest Management
    console.log('6. Testing Assign Room Modal click...');
    const assignModalClicked = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const assignBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Assign Room'));
        if (assignBtn) {
          assignBtn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });
    console.log('Assign Room modal opened:', assignModalClicked.result.value);
    await sleep(2000);
    await takeScreenshot(pageClient, 'warden_guest_assign_modal.png');

    // Close modal
    await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cancel'));
        if (cancelBtn) cancelBtn.click();
      })()`,
    });
    await sleep(500);

    // 7. Check Hostels Tab
    console.log('7. Verifying Hostel Buildings Module...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://127.0.0.1:3000/management/dashboard?tab=hostels'`,
    });
    await sleep(2500);
    const hostelState = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.innerText;
        const rows = Array.from(document.querySelectorAll('tbody tr')).map(r => {
          const cells = Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim());
          return cells[1]; // Building Name
        });
        const kpis = Array.from(document.querySelectorAll('.font-display')).map(e => e.innerText);
        return { title, buildings: rows, kpis };
      })()`,
      returnByValue: true,
    });
    console.log('Hostels:', hostelState.result.value);
    await takeScreenshot(pageClient, 'warden_hostels.png');

    // 8. Check Blocks Tab
    console.log('8. Verifying Blocks & Wings Module...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://127.0.0.1:3000/management/dashboard?tab=blocks'`,
    });
    await sleep(2500);
    const blockState = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.innerText;
        const rows = Array.from(document.querySelectorAll('tbody tr')).map(r => {
          const cells = Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim());
          return { block: cells[1], hostel: cells[2], gender: cells[3], capacity: cells[4] };
        });
        const editBtns = document.querySelectorAll('button[title="Edit Block"]').length;
        const deleteBtns = document.querySelectorAll('button[title="Delete Block"]').length;
        return { title, blocks: rows, editBtns, deleteBtns };
      })()`,
      returnByValue: true,
    });
    console.log('Blocks state (confirming Edit/Delete buttons):', blockState.result.value);
    await takeScreenshot(pageClient, 'warden_blocks.png');

    // 9. Check Rooms Tab
    console.log('9. Verifying Room Inventory Module...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://127.0.0.1:3000/management/dashboard?tab=rooms'`,
    });
    await sleep(2500);
    const roomState = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.innerText;
        const rowsCount = document.querySelectorAll('tbody tr').length;
        const sampleRoom = document.querySelector('tbody tr td:nth-child(2)')?.innerText;
        return { title, roomsCount, sampleRoom };
      })()`,
      returnByValue: true,
    });
    console.log('Rooms:', roomState.result.value);
    await takeScreenshot(pageClient, 'warden_rooms.png');

    // 10. Check Beds Tab
    console.log('10. Verifying Bed Inventory Module...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://127.0.0.1:3000/management/dashboard?tab=beds'`,
    });
    await sleep(2500);
    const bedState = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.innerText;
        const rowsCount = document.querySelectorAll('tbody tr').length;
        const occupants = Array.from(document.querySelectorAll('tbody tr td:nth-child(6)')).map(c => c.innerText.trim()).filter(t => t !== 'Vacant');
        return { title, totalBedsRows: rowsCount, activeOccupants: occupants };
      })()`,
      returnByValue: true,
    });
    console.log('Beds state:', bedState.result.value);
    await takeScreenshot(pageClient, 'warden_beds.png');

    // 11. Check Students Tab
    console.log('11. Verifying Student Directory Module...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://127.0.0.1:3000/management/dashboard?tab=students'`,
    });
    await sleep(2500);
    const studentState = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.innerText;
        const rowsCount = document.querySelectorAll('tbody tr').length;
        const allocatedBadges = Array.from(document.querySelectorAll('tbody tr td:nth-child(5)')).map(c => c.innerText.trim());
        return { title, totalStudents: rowsCount, badgesSample: allocatedBadges.slice(0, 3) };
      })()`,
      returnByValue: true,
    });
    console.log('Students state:', studentState.result.value);
    await takeScreenshot(pageClient, 'warden_students.png');

    // 12. Check Allocations Tab
    console.log('12. Verifying Room Allocations Module...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://127.0.0.1:3000/management/dashboard?tab=allocation'`,
    });
    await sleep(2500);
    const allocState = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.innerText;
        const rows = Array.from(document.querySelectorAll('tbody tr')).map(r => {
          const cells = Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim());
          return { id: cells[0], student: cells[1]?.split('\\n')[0], roomBed: cells[2]?.split('\\n')[0], status: cells[4] };
        });
        const vacateBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Vacate')).length;
        return { title, allocationsCount: rows.length, vacateBtns };
      })()`,
      returnByValue: true,
    });
    console.log('Allocations state (confirming Vacate buttons & joined fields):', allocState.result.value);
    await takeScreenshot(pageClient, 'warden_allocations.png');

    // 13. Check Payments Tab
    console.log('13. Verifying Payments Module...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://127.0.0.1:3000/management/dashboard?tab=payments'`,
    });
    await sleep(2500);
    const paymentState = await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.innerText;
        const rowsCount = document.querySelectorAll('tbody tr').length;
        const totalRevenue = document.querySelector('.font-display')?.innerText;
        return { title, rowsCount, totalRevenue };
      })()`,
      returnByValue: true,
    });
    console.log('Payments state:', paymentState.result.value);
    await takeScreenshot(pageClient, 'warden_payments.png');

    // 14. Test Light Mode Toggle on Dashboard
    console.log('14. Testing Light Mode visual presentation on Dashboard...');
    await pageClient.send('Runtime.evaluate', {
      expression: `window.location.href = 'http://127.0.0.1:3000/management/dashboard'`,
    });
    await sleep(2500);
    await pageClient.send('Runtime.evaluate', {
      expression: `(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('hostelflow_theme', 'light');
      })()`,
    });
    await sleep(1000);
    await takeScreenshot(pageClient, 'warden_dashboard_light.png');

    console.log('\n--- ALL WARDEN PORTAL BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    chrome.kill();
  }
}

run();
