/**
 * Build packages/admin with base /admin/ and publish it into the
 * storefront production artifact at packages/storefront/dist/admin.
 *
 * This is the documented Vercel packaging step — not a manual copy to prod.
 * Cross-platform (Windows/Linux). Sets VITE_BASE_PATH in-process so MSYS
 * cannot rewrite /admin/ into a filesystem path.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'packages', 'admin', 'dist');
const dest = path.join(root, 'packages', 'storefront', 'dist', 'admin');

const env = {
  ...process.env,
  VITE_BASE_PATH: '/admin/',
  MSYS_NO_PATHCONV: '1',
};

console.log('publish-admin: building admin with VITE_BASE_PATH=/admin/');
const build = spawnSync('npm', ['run', 'build', '-w', 'packages/admin'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: true,
});
if (build.status !== 0) {
  console.error('publish-admin: admin build failed');
  process.exit(build.status ?? 1);
}

const indexPath = path.join(src, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('publish-admin: missing', indexPath);
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('/admin/assets/')) {
  console.error('publish-admin: admin index.html is not built with base /admin/');
  console.error(html);
  process.exit(1);
}

const storefrontDist = path.join(root, 'packages', 'storefront', 'dist');
if (!fs.existsSync(path.join(storefrontDist, 'index.html'))) {
  console.error('publish-admin: storefront dist is missing — build storefront first');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

const publishedIndex = path.join(dest, 'index.html');
const assetsDir = path.join(dest, 'assets');
const assets = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
if (!fs.existsSync(publishedIndex) || assets.length === 0) {
  console.error('publish-admin: published artifact incomplete', { publishedIndex, assets });
  process.exit(1);
}

console.log('publish-admin: published', dest);
console.log('publish-admin: assets', assets.join(', '));
