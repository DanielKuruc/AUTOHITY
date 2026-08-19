import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Prefixes used by apiService.ts / exportService.ts when writing temp photos and PDFs
// to FileSystem.cacheDirectory. Under normal operation these are deleted right after
// upload/share, but a crash or an older app version could leave orphans behind.
const ORPHAN_PREFIXES = ['photo_', 'defect_', 'cover_', 'vykup_', 'report_'];

/**
 * Deletes leftover temp files from previous sessions. Safe to run on every startup:
 * matching files are always short-lived by design, so anything still present here
 * is guaranteed to be an orphan from a crash or an older build.
 */
export async function purgeOrphanCacheFiles(): Promise<void> {
  if (Platform.OS === 'web' || !FileSystem.cacheDirectory) return;
  try {
    const entries = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    for (const name of entries) {
      if (!ORPHAN_PREFIXES.some(prefix => name.startsWith(prefix))) continue;
      FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${name}`, { idempotent: true }).catch(() => {});
    }
  } catch (e) {
    // Best-effort cleanup - never block app startup on this
  }
}
