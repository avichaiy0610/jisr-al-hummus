#!/usr/bin/env node
// Tiny static server for local preview of site/ (no dependencies). npm start [-- <port>]
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const port = Number(process.argv[2]) || 8080;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };

createServer((req, res) => {
  let path = normalize(join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(site + sep) && path !== site) { res.writeHead(403).end(); return; }
  try { if (statSync(path).isDirectory()) path = join(path, 'index.html'); statSync(path); }
  catch { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(path).pipe(res);
}).listen(port, () => console.log(`ג'יסר א-חומוס: http://localhost:${port}/  (דמו: http://localhost:${port}/?demo)`));
