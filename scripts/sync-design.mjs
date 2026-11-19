import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const storefront = fileURLToPath(new URL('..', import.meta.url));
export const designFiles = [
  'app/truzov-design.css',
  'public/fonts/inter-latin.woff2',
  'public/fonts/inter-latin-ext.woff2',
  'public/fonts/Inter-OFL.txt',
];

export function isAdminCheckout(admin) {
  try {
    return JSON.parse(readFileSync(join(admin, 'package.json'), 'utf8')).name === 'sellzy-dashboard-next';
  } catch {
    return false;
  }
}

export function syncDesign(admin, { check = false, files = designFiles } = {}) {
  let differences = 0;
  for (const file of files) {
    const source = join(storefront, file);
    const target = join(admin, file);
    const encoding = file.endsWith('.woff2') ? 'base64' : 'utf8';
    const content = readFileSync(source, encoding).replaceAll('\r\n', '\n');
    if (existsSync(target) && content === readFileSync(target, encoding).replaceAll('\r\n', '\n')) continue;

    differences++;
    if (check) {
      console.error(`Admin design file differs: ${file}`);
    } else {
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
    }
  }
  return differences;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [adminPath, mode, extra] = process.argv.slice(2);
  if (!adminPath || (mode && mode !== '--check') || extra) {
    console.error('Usage: npm run design:sync -- <admin checkout> [--check]');
    process.exit(1);
  }

  const admin = resolve(adminPath);
  if (!isAdminCheckout(admin)) {
    console.error('Expected the admin app root containing the sellzy-dashboard-next package.');
    process.exit(1);
  }

  const check = mode === '--check';
  const differences = syncDesign(admin, { check });
  if (check && differences) process.exitCode = 1;
  else console.log(check ? 'Admin design files match.' : 'Synced shared design files to admin.');
}
