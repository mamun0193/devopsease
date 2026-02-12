import logger from "../utils/logger.js";

class ReadinessService {
    constructor() {
        this.dockerReady = false;
        this.historyReady = false;
        this.startTime = Date.now();
    }

    setDockerReady(ready) {
        this.dockerReady = ready;

    }

    setHistoryReady(ready) {
        this.historyReady = ready;

    }

    isReady() {
        return this.dockerReady && this.historyReady;
    }

    getStatus() {
        return {
            ready: this.isReady(),
            docker: this.dockerReady,
            history: this.historyReady,
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
        };
    }
}

const readinessService = new ReadinessService();

export default readinessService;
