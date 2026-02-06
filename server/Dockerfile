FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Expose port
EXPOSE 4000

# Start the server
CMD ["node", "src/index.js"]
