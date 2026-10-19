// One-command setup and launch: installs dependencies, creates server/.env, checks MongoDB,
// seeds the default accounts and starts the app. Safe to run every time.
// Usage: npm run setup   (or double-click start-windows.bat / run ./start-mac-linux.sh)
import { spawn, spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, 'server', '.env');
const examplePath = path.join(root, 'server', '.env.example');
const APP_URL = 'http://localhost:5173';

const step = (n, so, en) => console.log(`\n\x1b[36m[${n}/5] ${so}\x1b[0m  (${en})`);
const ok = (msg) => console.log(`\x1b[32m  ✔ ${msg}\x1b[0m`);
const fail = (lines) => {
  console.error('\n\x1b[31m  ✘ ' + lines.join('\n    ') + '\x1b[0m\n');
  process.exit(1);
};

// Commands are fixed strings (no user input), passed whole to the shell so npm.cmd resolves on Windows.
function run(args, cwd = root) {
  const res = spawnSync(`npm ${args.join(' ')}`, { cwd, stdio: 'inherit', shell: true });
  if (res.status !== 0) fail([`Amarkan wuu fashilmay: npm ${args.join(' ')}`, `Command failed: npm ${args.join(' ')}`]);
}

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function canConnect(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (result) => { socket.destroy(); resolve(result); };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  try {
    spawn(cmd, { shell: true, stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {
    /* no browser available; the URL is printed below */
  }
}

// 1. Node.js version
step(1, 'Hubinta Node.js', 'checking Node.js');
const major = Number(process.versions.node.split('.')[0]);
if (major < 18) fail([`Node.js ${process.versions.node} waa duug. Rakib nooca LTS: https://nodejs.org`, 'Node.js 18 or newer is required.']);
ok(`Node.js ${process.versions.node}`);

// 2. Dependencies
step(2, 'Rakibidda waxyaabaha loo baahan yahay (dhowr daqiiqo ayay qaadan kartaa)', 'installing dependencies');
run(['install', '--no-audit', '--no-fund']);
run(['install', '--no-audit', '--no-fund', '--prefix', 'server']);
run(['install', '--no-audit', '--no-fund', '--prefix', 'client']);
ok('Waa la rakibay / installed');

// 3. server/.env
step(3, 'Dejinta server-ka (.env)', 'configuring server/.env');
if (!fs.existsSync(envPath)) {
  const secret = crypto.randomBytes(48).toString('hex');
  const content = fs.readFileSync(examplePath, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
  fs.writeFileSync(envPath, content);
  ok('server/.env waa la sameeyay, furaha sirta ee JWT si toos ah ayaa loo abuuray');
} else {
  ok('server/.env horey ayuu u jiray / already exists');
}
const env = readEnv();
const mongoUri = env.MONGO_URI || 'mongodb://127.0.0.1:27017/business_management';

// 4. MongoDB
step(4, 'Hubinta MongoDB', 'checking MongoDB');
if (mongoUri.startsWith('mongodb+srv://')) {
  ok('MongoDB Atlas (online) ayaa la isticmaalayaa');
} else {
  const m = mongoUri.match(/^mongodb:\/\/(?:[^@/]+@)?([^:/,]+)(?::(\d+))?/);
  const host = m?.[1] || '127.0.0.1';
  const port = Number(m?.[2] || 27017);
  let reachable = false;
  for (let i = 0; i < 3 && !reachable; i++) reachable = await canConnect(host, port);
  if (!reachable) {
    fail([
      `MongoDB lagama helin ${host}:${port}. / MongoDB is not reachable at ${host}:${port}.`,
      '',
      'Xalka / Fix:',
      '  Windows: Start menu → qor "Services" → raadi "MongoDB Server" → riix "Start".',
      '  Mac (Homebrew): brew services start mongodb-community',
      '  Ama isticmaal MongoDB Atlas (bilaash): https://www.mongodb.com/atlas',
      '    kadibna link-ga ku dheji MONGO_URI ee faylka server/.env',
      '',
      'Kadib mar kale socodsii faylkan. / Then run this again.',
    ]);
  }
  ok(`MongoDB waa shaqeynayaa (${host}:${port})`);
}

// 5. Seed + start
step(5, 'Abuurista akoonnada tijaabada iyo socodsiinta app-ka', 'seeding accounts and starting the app');
run(['run', 'seed', '--prefix', 'server']);

console.log(`
\x1b[32m  ✔ Diyaar! App-ku wuxuu ka furmayaa: ${APP_URL}\x1b[0m
    Gal: admin@example.com / admin123   (riix SO si uu Af-Soomaali u noqdo)
    Joojinta: Ctrl + C
`);

const dev = spawn('npm run dev', { cwd: root, stdio: 'inherit', shell: true });
setTimeout(() => openBrowser(APP_URL), 6000);
dev.on('exit', (code) => process.exit(code ?? 0));
