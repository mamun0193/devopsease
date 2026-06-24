export function generateHealthchecks(spec, warnings) {
    const healthchecks = {};

    for (const service of spec.services) {
        let testCmd = ["CMD-SHELL", `curl -f http://localhost:${service.port}/health || exit 1`];
        
        // Infer healthchecks
        if (service.type === 'worker' || service.framework === 'celery') {
            testCmd = ["CMD-SHELL", "echo 'worker running'"];
            warnings.push(`Inferred dummy healthcheck for worker service: ${service.name}`);
        } else if (service.language === 'go') {
            testCmd = ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", `http://localhost:${service.port}/`];
        }

        healthchecks[service.name] = {
            test: testCmd,
            interval: "30s",
            timeout: "10s",
            retries: 3,
            start_period: "40s"
        };
    }

    return {
        spec: healthchecks,
        rendered: JSON.stringify(healthchecks, null, 2)
    };
}
