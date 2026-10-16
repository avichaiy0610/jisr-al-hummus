// Copies the few Three.js files the site needs into site/vendor (committed, so the site has no build step).
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const three = join(root, 'node_modules', 'three');
const out = join(root, 'site', 'vendor');
mkdirSync(join(out, 'controls'), { recursive: true });

copyFileSync(join(three, 'build', 'three.module.js'), join(out, 'three.module.js'));
copyFileSync(join(three, 'build', 'three.core.js'), join(out, 'three.core.js'));
copyFileSync(join(three, 'examples', 'jsm', 'controls', 'OrbitControls.js'), join(out, 'controls', 'OrbitControls.js'));
copyFileSync(join(three, 'LICENSE'), join(out, 'THREE-LICENSE.txt'));
const { version } = JSON.parse(readFileSync(join(three, 'package.json'), 'utf8'));
console.log(`three ${version} → site/vendor`);
