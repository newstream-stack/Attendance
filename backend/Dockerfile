FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage — hot reload via ts-node-dev
FROM base AS development
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["npm", "start"]
