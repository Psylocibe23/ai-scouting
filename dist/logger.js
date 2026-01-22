"use strict";
var AppLogger = /** @class */ (function () {
    function AppLogger() {
    }
    AppLogger.info = function (action, message, data) {
        if (data !== undefined) {
            console.log("[INFO] [".concat(action, "] ").concat(message), data);
        }
        else {
            console.log("[INFO] [".concat(action, "] ").concat(message));
        }
    };
    AppLogger.warn = function (action, message, data) {
        if (data !== undefined) {
            console.warn("[WARN] [".concat(action, "] ").concat(message), data);
        }
        else {
            console.warn("[WARN] [".concat(action, "] ").concat(message));
        }
    };
    AppLogger.error = function (action, message, data) {
        if (data !== undefined) {
            console.error("[ERROR] [".concat(action, "] ").concat(message), data);
        }
        else {
            console.error("[ERROR] [".concat(action, "] ").concat(message));
        }
    };
    return AppLogger;
}());
