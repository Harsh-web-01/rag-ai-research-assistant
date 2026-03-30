# Stage 1: Build the Next.js application statically
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm install

# Copy all files (.dockerignore excludes .env.local so Terraform API URL from build-arg wins)
COPY . .

# Pass build arguments (e.g. your AWS API Gateway URL from docker-compose)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the static HTML export in the /app/out directory
RUN npm run build

# Stage 2: Serve the static application using Nginx
FROM nginx:alpine

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the static assets from the builder stage into Nginx
COPY --from=builder /app/out /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
