import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const port = Number(process.env.PORT || 4173);
http.createServer(async (req,res)=>{
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  const filepath = resolve(root, '.' + decodeURIComponent(pathname === '/'? '/index.html' : pathname));
  if (!filepath.startsWith(root + sep)) {res.writeHead(403);res.end('Forbidden');return;}
  try {
    if (!(await stat(filepath)).isFile()) throw new Error('Not a file');
    const bytes = await readFile(filepath);
    res.writeHead(200, {'Content-Type':types[extname(filepath)]||'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
    res.end(bytes);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`BarrioRadar local: http://127.0.0.1:${port}`));
