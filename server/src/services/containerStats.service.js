import docker from '../docker/client.js';
import logger from '../utils/logger.js';

class ContainerStatsService {
  constructor() {
    this.previousStats = new Map();
  }

  async getContainerStats(containerId) {
    try {
      const container = docker.getContainer(containerId);

      const inspect = await container.inspect();
      
      if (!inspect.State.Running) {
        return {
          success: false,
          error: 'Container is not running',
          statusCode: 400
        };
      }

      const statsStream = await container.stats({ stream: false });
      
      const stats = {
        cpu: this.calculateCPU(statsStream, containerId),
        memory: this.calculateMemory(statsStream),
        network: this.calculateNetwork(statsStream)
      };

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      logger.error(`Failed to get container stats: ${error.message}`, {
        containerId,
        error: error.stack
      });

      if (error.statusCode === 404) {
        return {
          success: false,
          error: 'Container not found',
          statusCode: 404
        };
      }

      return {
        success: false,
        error: 'Failed to retrieve container stats',
        statusCode: 500
      };
    }
  }

  calculateCPU(stats, containerId) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                     (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                        (stats.precpu_stats.system_cpu_usage || 0);
    const numCPUs = stats.cpu_stats.online_cpus || 1;

    let usagePercent = 0;
    if (systemDelta > 0 && cpuDelta > 0) {
      usagePercent = (cpuDelta / systemDelta) * numCPUs * 100;
    }

    const previous = this.previousStats.get(containerId);
    if (previous) {
      const timeDelta = (stats.read - previous.read) / 1e9;
      const cpuDeltaBetweenReads = stats.cpu_stats.cpu_usage.total_usage - previous.cpuUsage;
      
      if (timeDelta > 0 && cpuDeltaBetweenReads > 0) {
        usagePercent = (cpuDeltaBetweenReads / (timeDelta * 1e9)) * numCPUs * 100;
      }
    }

    this.previousStats.set(containerId, {
      read: stats.read,
      cpuUsage: stats.cpu_stats.cpu_usage.total_usage
    });

    return {
      usagePercent: Math.min(Math.round(usagePercent * 10) / 10, 100)
    };
  }

  calculateMemory(stats) {
    const usedBytes = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
    const limitBytes = stats.memory_stats.limit;

    const usedMB = Math.round(usedBytes / (1024 * 1024));
    const limitMB = Math.round(limitBytes / (1024 * 1024));
    const usagePercent = Math.round((usedBytes / limitBytes) * 100 * 10) / 10;

    return {
      usedMB,
      limitMB,
      usagePercent: Math.min(usagePercent, 100)
    };
  }

  calculateNetwork(stats) {
    if (!stats.networks) {
      return { rxMB: 0, txMB: 0 };
    }

    let totalRx = 0;
    let totalTx = 0;

    Object.values(stats.networks).forEach(network => {
      totalRx += network.rx_bytes || 0;
      totalTx += network.tx_bytes || 0;
    });

    return {
      rxMB: Math.round((totalRx / (1024 * 1024)) * 100) / 100,
      txMB: Math.round((totalTx / (1024 * 1024)) * 100) / 100
    };
  }

  clearPreviousStats(containerId) {
    this.previousStats.delete(containerId);
  }
}

export default new ContainerStatsService();
