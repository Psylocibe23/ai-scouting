class AppLogger {
    static info(action: string, message: string, data?: unknown): void {
        if (data !== undefined) {
            console.log(`[INFO] [${action}] ${message}`, data);
        } else {
            console.log(`[INFO] [${action}] ${message}`);
        }
    }

    static warn(action: string, message: string, data?: unknown): void {
        if (data !== undefined) {
            console.warn(`[WARN] [${action}] ${message}`, data);
        } else {
            console.warn(`[WARN] [${action}] ${message}`);
        }
    }

    static error(action: string, message: string, data?: unknown): void {
        if (data !== undefined) {
            console.error(`[ERROR] [${action}] ${message}`, data);
        } else {
            console.error(`[ERROR] [${action}] ${message}`);
        }
    }
}
