export function generateDockerfiles(spec, warnings) {
    const dockerfiles = [];

    for (const service of spec.services) {
        if (service.hasDockerfile) {
            dockerfiles.push({
                serviceName: service.name,
                mode: 'existing',
                path: service.dockerfilePath || 'Dockerfile',
                content: '# Using existing Dockerfile referenced in blueprint',
                reason: 'Existing Dockerfile detected'
            });
            continue;
        }

        const content = buildDockerfileContent(service, warnings);
        dockerfiles.push({
            serviceName: service.name,
            mode: 'generated',
            path: `Dockerfile.${service.name}`,
            content
        });
    }

    return dockerfiles;
}

function buildDockerfileContent(service, warnings) {
    const { language, framework, packageManager, port, type } = service;
    
    // Priority 3: Framework accuracy (Next.js, Vite, TurboRepo/Nx)
    const isMonorepo = false; // Logic to detect monorepo from blueprint could go here
    
    if (language === 'javascript' || language === 'typescript') {
        if (framework?.name?.toLowerCase() === 'next.js') {
            return buildNextjsDockerfile(packageManager, port);
        } else if (framework?.name?.toLowerCase() === 'vite' || framework?.name?.toLowerCase() === 'react') {
            return buildStaticNginxDockerfile(packageManager, port);
        }
        return buildNodeDockerfile(packageManager, port);
    } else if (language === 'python') {
        return buildPythonDockerfile(framework?.name, port);
    } else if (language === 'java') {
        return buildJavaDockerfile(framework?.name, port);
    } else if (language === 'go') {
        return buildGoDockerfile(port);
    } else if (language === 'rust') {
        return buildRustDockerfile(port);
    } else if (language === 'php' || framework?.name?.toLowerCase() === 'laravel') {
        return buildLaravelDockerfile(port);
    } else if (language === 'c#' || language === 'dotnet') {
        return buildDotnetDockerfile(port);
    } else {
        warnings.push(`Unknown framework/language for ${service.name}. Generated basic fallback Dockerfile. Please review.`);
        return buildFallbackDockerfile(port);
    }
}

function buildNextjsDockerfile(pm = 'npm', port) {
    const installCmd = pm === 'yarn' ? 'yarn install --frozen-lockfile' : pm === 'pnpm' ? 'pnpm install' : 'npm ci';
    const buildCmd = pm === 'yarn' ? 'yarn build' : pm === 'pnpm' ? 'pnpm build' : 'npm run build';
    return `FROM node:18-alpine AS base

FROM base AS builder
WORKDIR /app
COPY package.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json'} ./
RUN ${installCmd}
COPY . .
RUN ${buildCmd}

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${port}
# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE ${port}
CMD ["node", "server.js"]`;
}

function buildStaticNginxDockerfile(pm = 'npm', port) {
    const installCmd = pm === 'yarn' ? 'yarn install --frozen-lockfile' : pm === 'pnpm' ? 'pnpm install' : 'npm ci';
    const buildCmd = pm === 'yarn' ? 'yarn build' : pm === 'pnpm' ? 'pnpm build' : 'npm run build';
    return `FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json'} ./
RUN ${installCmd}
COPY . .
RUN ${buildCmd}

FROM nginx:alpine
# Copy static files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# Modify default conf to use the specified port and support SPA routing
RUN sed -i "s/listen       80;/listen       ${port};/g" /etc/nginx/conf.d/default.conf && \\
    sed -i "/location \\/ {/a \\        try_files \\$uri \\$uri\\/ \\/index.html;" /etc/nginx/conf.d/default.conf

EXPOSE ${port}
CMD ["nginx", "-g", "daemon off;"]`;
}

function buildNodeDockerfile(pm = 'npm', port) {
    const installCmd = pm === 'yarn' ? 'yarn install --frozen-lockfile' : pm === 'pnpm' ? 'pnpm install' : 'npm ci';
    const startCmd = pm === 'yarn' ? 'yarn start' : pm === 'pnpm' ? 'pnpm start' : 'npm start';
    
    return `FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json'} ./
RUN ${installCmd}
COPY . .
RUN ${pm === 'yarn' ? 'yarn build' : pm === 'pnpm' ? 'pnpm build' : 'npm run build'} || echo "No build script"

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE ${port}
USER node
CMD ["${startCmd.split(' ').join('", "')}"]`;
}

function buildPythonDockerfile(framework, port) {
    const startCmd = framework === 'django' ? `gunicorn myproject.wsgi:application --bind 0.0.0.0:${port}` : `uvicorn main:app --host 0.0.0.0 --port ${port}`;
    return `FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${port}
RUN useradd -m myuser
USER myuser
CMD ["sh", "-c", "${startCmd}"]`;
}

function buildJavaDockerfile(framework, port) {
    return `FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests || ./gradlew build -x test

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE ${port}
USER 1000
CMD ["java", "-jar", "app.jar"]`;
}

function buildGoDockerfile(port) {
    return `FROM golang:1.20-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE ${port}
USER 1000
CMD ["./main"]`;
}

function buildRustDockerfile(port) {
    return `FROM rust:1.70-slim AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bullseye-slim
WORKDIR /app
COPY --from=builder /app/target/release/app .
EXPOSE ${port}
USER 1000
CMD ["./app"]`;
}

function buildLaravelDockerfile(port) {
    return `FROM php:8.2-apache
WORKDIR /var/www/html
RUN apt-get update && apt-get install -y libzip-dev zip && docker-php-ext-install zip pdo pdo_mysql
COPY . .
# Install composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --optimize-autoloader
# Update apache config
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${'$'}{APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${'$'}{APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf
RUN a2enmod rewrite
# Create non-root user wrapper logic or adjust permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
EXPOSE 80
# Note: Apache listens on 80 by default. Port variable mapping might require further script adjustments.
CMD ["apache2-foreground"]`;
}

function buildDotnetDockerfile(port) {
    return `FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:${port}
EXPOSE ${port}
# Use the built-in non-root user
USER $APP_UID
ENTRYPOINT ["dotnet", "App.dll"]`;
}

function buildFallbackDockerfile(port) {
    return `FROM ubuntu:22.04
WORKDIR /app
COPY . .
EXPOSE ${port}
# Priority 1: Security - Fallback must also not run as root
RUN useradd -m fallbackuser
USER fallbackuser
CMD ["echo", "Fallback Dockerfile executed. Please configure properly."]`;
}
