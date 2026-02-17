import logger from "../utils/logger.js";
import { EventEmitter } from "events";

class LifecycleManager extends EventEmitter {
    constructor() {
        super();
        this._isShuttingDown = false;
    }

    get isShuttingDown() {
        return this._isShuttingDown;
    }

    setShuttingDown(value = true) {
        if (this._isShuttingDown === value) return;

        this._isShuttingDown = value;
        if (value) {
            logger.warn("⚠️ System entering shutdown state");
            this.emit("shutdown_start");
        }
    }
}

// Singleton instance
const lifecycle = new LifecycleManager();

export default lifecycle;
