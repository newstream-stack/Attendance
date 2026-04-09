FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage — Vite dev server with hot reload
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage — serve via nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
