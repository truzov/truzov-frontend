import { watchFile } from 'node:fs';
import { join, resolve } from 'node:path';
import { designFiles, isAdminCheckout, storefront, syncDesign } from './sync-design.mjs';

const customPath = process.env.TRUZOV_ADMIN_PATH?.trim();
const admin = resolve(storefront, customPath || '../ADMIN/Main_File/Sellzy_Dashboard');

function updateAdmin(files) {
  try {
    if (syncDesign(admin, { files })) console.log('[design] Synced shared files to admin.');
  } catch (error) {
    console.warn(`[design] Sync failed: ${error.message}`);
  }
}

if (isAdminCheckout(admin)) {
  updateAdmin(designFiles);
  for (const file of designFiles) {
    // Polling follows the path when an editor replaces the file on save.
    watchFile(join(storefront, file), { interval: 500, persistent: false }, (current) => {
      if (current.nlink) updateAdmin([file]);
    });
  }
} else if (customPath) {
  console.warn('[design] TRUZOV_ADMIN_PATH does not point to an admin checkout.');
}
