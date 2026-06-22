export function planCompose(analysis, blueprint) {
  // If there's existing compose file in any service or root, mark as existing
  const hasExistingCompose = blueprint.services.some(s => s.infrastructureStatus.composeExists) || 
                             (analysis.infrastructure && analysis.infrastructure.dockerCompose);

  if (hasExistingCompose) {
    blueprint.compose = { mode: 'existing' };
    return;
  }

  // Determine if we need compose (multiple services or databases present)
  const hasDatabases = blueprint.services.some(s => analysis.services.find(rs => rs.name === s.name)?.databases?.length > 0);
  
  if (blueprint.services.length <= 1 && !hasDatabases) {
    blueprint.compose = { mode: 'none', reason: 'Single service without external databases' };
    return;
  }

  const services = {};
  const volumes = {};
  const networks = {
    internal: { driver: 'bridge' }
  };

  // Map application services
  for (const service of blueprint.services) {
    services[service.name] = {
      build: {
        context: service.buildStrategy.context || '.',
        dockerfile: service.buildStrategy.dockerfile || 'Dockerfile'
      },
      ports: service.ports.map(p => `${p}:${p}`),
      environment: [],
      networks: ['internal'],
      restart: 'unless-stopped',
      depends_on: service.dependencies
    };
  }

  // Map database services
  for (const rawService of analysis.services) {
    if (rawService.databases) {
      for (const db of rawService.databases) {
        let image = '';
        let port = '';
        let env = [];
        let dbVolume = `${db}-data`;

        if (db === 'postgres') {
          image = 'postgres:15-alpine';
          port = '5432:5432';
          env = ['POSTGRES_USER=user', 'POSTGRES_PASSWORD=password', 'POSTGRES_DB=db'];
        } else if (db === 'mongodb') {
          image = 'mongo:6';
          port = '27017:27017';
        } else if (db === 'redis') {
          image = 'redis:7-alpine';
          port = '6379:6379';
        } else if (db === 'mysql') {
          image = 'mysql:8';
          port = '3306:3306';
          env = ['MYSQL_ROOT_PASSWORD=root', 'MYSQL_DATABASE=db'];
        }

        if (image) {
          services[db] = {
            image,
            ports: [port],
            environment: env,
            networks: ['internal'],
            volumes: [`${dbVolume}:/data/db`] // simplified
          };
          volumes[dbVolume] = {};
          
          // Add dependency from the app service to this db
          if (!services[rawService.name].depends_on.includes(db)) {
            services[rawService.name].depends_on.push(db);
          }
        }
      }
    }
  }

  blueprint.compose = {
    mode: 'generated',
    version: '3.8',
    services,
    networks,
    volumes
  };
}
