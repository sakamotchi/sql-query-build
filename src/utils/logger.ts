/**
 * Logger utility for frontend
 *
 * Note: Tauri plugin-log is optional. This logger uses console logging
 * and can be extended to use Tauri's logging plugin when installed.
 */

export class Logger {
  static info(message: string, data?: unknown) {
    console.info(`[INFO] ${message}`, data !== undefined ? data : '');
  }

  static error(message: string, error?: unknown) {
    console.error(`[ERROR] ${message}`, error !== undefined ? error : '');
  }

  static warn(message: string, data?: unknown) {
    console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
  }

  static debug(message: string, data?: unknown) {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  }
}
