// Builds a server-less showcase of the studio (landing, scroll film, 3D editor, photo demo) into dist-static/.
// Accounts, saving, quotes and the shop dashboard are switched off there. Usage: node scripts/build-static.mjs
// The output page has no <html>/<head>/<body> wrapper and uses plain #name routes, as required by the host it is published to.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'dist-static'), pub = path.join(root, 'public'), three = path.join(root, 'node_modules', 'three');
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
cpSync(path.join(pub, 'assets'), path.join(out, 'assets'), { recursive: true });
cpSync(path.join(pub, 'css'), path.join(out, 'css'), { recursive: true });
mkdirSync(path.join(out, 'js')); mkdirSync(path.join(out, 'vendor/controls'), { recursive: true }); mkdirSync(path.join(out, 'vendor/environments'), { recursive: true });
const routes = (s) => s.replaceAll('#/studio/edit', '#editor').replaceAll('#/studio', '#studio');
for (const f of readdirSync(path.join(pub, 'js'))) writeFileSync(path.join(out, 'js', f), routes(readFileSync(path.join(pub, 'js', f), 'utf8')));
copyFileSync(path.join(three, 'build/three.module.min.js'), path.join(out, 'vendor/three.module.min.js'));
copyFileSync(path.join(three, 'examples/jsm/controls/OrbitControls.js'), path.join(out, 'vendor/controls/OrbitControls.js'));
copyFileSync(path.join(three, 'examples/jsm/environments/RoomEnvironment.js'), path.join(out, 'vendor/environments/RoomEnvironment.js'));

// Catalog baked from the same seed data the server uses (throwaway database).
const tmp = path.join(out, '.seed'); mkdirSync(tmp);
process.env.BWW_DATA_DIR = tmp; process.env.PORT = '0';
const { server } = await import(path.join(root, 'server.js')).then((m) => m.default ?? m).catch((e) => { throw e; });
const port = await new Promise((r) => (server.listening ? r(server.address().port) : server.on('listening', () => r(server.address().port))));
const config = await (await fetch(`http://localhost:${port}/api/config`)).json();
server.close(); void DatabaseSync;

writeFileSync(path.join(out, 'index.html'), `<title>Boselli Wrap Works</title>
<meta name="description" content="Showcase of the Boselli Wrap Works vehicle wrap visualizer.">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&family=Saira:ital,wdth,wght@0,75..125,500..900;1,75..125,500..900&display=swap">
<link rel="stylesheet" href="css/app.css">
<script type="importmap">{"imports":{"three":"./vendor/three.module.min.js","three/addons/":"./vendor/"}}</script>
<script>window.BWW_STATIC = ${JSON.stringify({ config })};</script>
<a class="skip" href="#view">Skip to content</a>
<header class="topbar" id="topbar"></header>
<main id="view" tabindex="-1"><div class="boot"><span class="spin"></span>Loading the studio…</div></main>
<nav class="tabbar" id="tabbar" aria-label="Primary"></nav>
<script type="module" src="js/app.js"></script>
`);
rmSync(tmp, { recursive: true, force: true });
const list = []; const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : list.push(path.relative(out, path.join(d, e.name))); }; walk(out);
writeFileSync(path.join(out, 'files.json'), JSON.stringify(list.filter((f) => f !== 'index.html' && f !== 'files.json').sort()));
console.log(`dist-static ready: ${list.length} files`); process.exit(0);
