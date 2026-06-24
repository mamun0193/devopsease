export function generateEnvironment(spec) {
    const envVars = new Set();
    const specObj = {};

    for (const service of spec.services) {
        if (service.envVars) {
            for (const env of service.envVars) {
                const [key] = env.split('=');
                envVars.add(key);
                specObj[key] = '';
            }
        }
    }

    const rendered = Array.from(envVars).map(key => `${key}=`).join('\n');

    return {
        spec: specObj,
        rendered
    };
}
