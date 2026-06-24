export function generateProxy(spec) {
    let rendered = `worker_processes auto;
events {
    worker_connections 1024;
}
http {
    include mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    
    server {
        listen 80;
        server_name localhost;
`;

    const proxySpec = {
        upstreams: [],
        routes: []
    };

    // Filter web services (this is a heuristic; assuming all services without 'worker' in name/type are web)
    const webServices = spec.services.filter(s => s.type !== 'worker' && !s.name.includes('worker'));

    if (webServices.length === 0) {
        return { spec: null, rendered: null };
    }

    // Default route to the first web service
    const defaultService = webServices[0];
    
    rendered += `
        location / {
            proxy_pass http://${defaultService.name}:${defaultService.port};
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    `;

    proxySpec.routes.push({
        path: '/',
        target: `http://${defaultService.name}:${defaultService.port}`
    });

    for (let i = 1; i < webServices.length; i++) {
        const svc = webServices[i];
        rendered += `
        location /${svc.name} {
            proxy_pass http://${svc.name}:${svc.port};
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
        `;
        proxySpec.routes.push({
            path: `/${svc.name}`,
            target: `http://${svc.name}:${svc.port}`
        });
    }

    rendered += `
    }
}`;

    return {
        spec: proxySpec,
        rendered
    };
}
