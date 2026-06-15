# Frontend — build the Vite app, then serve the static bundle with nginx.

# --- Build stage ---
FROM node:22-alpine AS build

WORKDIR /app

# Install deps first (cached until package-lock.json changes).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars at build time, so the API URL must be known here. The
# browser (not the container) calls this URL, so it points at the published
# backend port. Override with --build-arg VITE_API_URL=... for other hosts.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine AS serve

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
