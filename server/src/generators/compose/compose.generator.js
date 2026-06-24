import yaml from 'yaml';

export function generateCompose(spec, warnings) {
    // Priority 2: Infrastructure Preservation
    const existingCompose = spec.services.some(s => s.infrastructureStatus?.composeExists);
    if (existingCompose) {
        return {
            mode: 'existing',
            reason: 'Existing docker-compose.yml detected in repository.',
            recommendations: ['Consider reviewing environment variables mapped to Compose.']
        };
    }

    const composeSpec = {
        version: '3.8',
        services: {},
        networks: {
            app_network: { driver: 'bridge' }
        },
        volumes: {}
    };

    let needsDbPasswordWarning = false;

    for (const service of spec.services) {
        const composeService = {
            build: {
                context: '.',
                dockerfile: service.hasDockerfile ? service.dockerfilePath : `Dockerfile.${service.name}`
            },
            ports: [`${service.port}:${service.port}`],
            env_file: ['.env'], // Priority 5: Env file referencing
            environment: [...(service.envVars || [])], // Will still inject explicitly if needed, but preferable to rely on env_file
            networks: ['app_network'],
            restart: 'unless-stopped'
        };

        if (service.dependencies && service.dependencies.length > 0) {
            composeService.depends_on = service.dependencies.reduce((acc, dep) => {
                acc[dep] = { condition: 'service_started' };
                return acc;
            }, {});
        }

        composeSpec.services[service.name] = composeService;

        // Add standard database dependencies
        if (service.databaseConfig) {
            needsDbPasswordWarning = true;
            const dbName = `${service.name}_db`;
            let dbImage = 'postgres:15-alpine';
            let dbPort = 5432;
            // Priority 1: Security - replace hardcoded plain text passwords with references
            let dbEnv = [
                'POSTGRES_USER=${POSTGRES_USER:-postgres}', 
                'POSTGRES_PASSWORD=${POSTGRES_PASSWORD}', 
                'POSTGRES_DB=${POSTGRES_DB:-mydb}'
            ];

            if (service.databaseConfig.type === 'mysql') {
                dbImage = 'mysql:8';
                dbPort = 3306;
                dbEnv = ['MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}', 'MYSQL_DATABASE=${MYSQL_DATABASE:-mydb}'];
            } else if (service.databaseConfig.type === 'mongodb') {
                dbImage = 'mongo:6';
                dbPort = 27017;
                dbEnv = ['MONGO_INITDB_ROOT_USERNAME=${MONGO_INITDB_ROOT_USERNAME:-admin}', 'MONGO_INITDB_ROOT_PASSWORD=${MONGO_INITDB_ROOT_PASSWORD}'];
            }

            composeSpec.services[dbName] = {
                image: dbImage,
                ports: [`${dbPort}:${dbPort}`],
                env_file: ['.env'], // Priority 5
                environment: dbEnv,
                networks: ['app_network'],
                volumes: [`${dbName}_data:/var/lib/${service.databaseConfig.type === 'postgres' ? 'postgresql/data' : service.databaseConfig.type === 'mysql' ? 'mysql' : 'mongodb'}`],
                restart: 'unless-stopped'
            };

            composeSpec.volumes[`${dbName}_data`] = {};
            if (!composeService.depends_on) composeService.depends_on = {};
            composeService.depends_on[dbName] = { condition: 'service_started' };
        }

        if (service.redisConfig) {
            const redisName = `${service.name}_redis`;
            composeSpec.services[redisName] = {
                image: 'redis:7-alpine',
                ports: ['6379:6379'],
                networks: ['app_network'],
                restart: 'unless-stopped'
            };
            if (!composeService.depends_on) composeService.depends_on = {};
            composeService.depends_on[redisName] = { condition: 'service_started' };
        }
    }

    if (needsDbPasswordWarning) {
        warnings.push("Database credentials are required. Please populate POSTGRES_PASSWORD, MYSQL_ROOT_PASSWORD, or MONGO_INITDB_ROOT_PASSWORD in your .env file before deploying.");
    }

    return {
        spec: composeSpec,
        rendered: yaml.stringify(composeSpec)
    };
}
