export function planResources(analysis, blueprint) {
  const resources = {};

  for (const service of blueprint.services) {
    const { language, framework } = service;

    let cpu = 0.5;
    let ram = "512MB";
    let storage = "250MB";

    if (language === 'java' || language === 'c#') {
      cpu = 1.0;
      ram = "1GB";
      storage = "500MB";
    } else if (language === 'python' && framework?.name === 'django') {
      cpu = 0.8;
      ram = "512MB";
      storage = "500MB";
    } else if (language === 'go' || language === 'rust') {
      cpu = 0.2;
      ram = "128MB";
      storage = "50MB";
    } else if (language === 'javascript' || language === 'typescript') {
      if (framework?.name === 'react' || framework?.name === 'vue') {
        // Typically served by nginx statically
        cpu = 0.1;
        ram = "64MB";
        storage = "50MB";
      } else {
        // Node backend
        cpu = 0.5;
        ram = "512MB";
        storage = "250MB";
      }
    }

    resources[service.name] = {
      cpu,
      ram,
      storage
    };
  }

  blueprint.resources = resources;
}
