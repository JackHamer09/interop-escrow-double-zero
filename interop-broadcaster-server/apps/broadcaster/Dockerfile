FROM node:20-alpine AS base-stage

WORKDIR /usr/src/app

# Copy necessary files
COPY --chown=node:node package*.json ./
COPY --chown=node:node ./packages/server/package*.json ./packages/server/

# Build stage
FROM base-stage AS build-stage

# Set environment variables
ENV NODE_ENV=development

# Install dependencies
RUN apk update && apk add --no-cache \
  build-base \
  python3 \
  make \
  g++ \
  bash
RUN npm ci && npm cache clean --force

# Copy source code for api and common
COPY --chown=node:node ./packages/server/. ./packages/server

# Build the api
RUN npm run build -w=server

FROM base-stage AS production-stage

# Copy built files from the build-stage
COPY --chown=node:node --from=build-stage /usr/src/app/packages/server/dist ./packages/server/dist

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Remove .npmrc for security
RUN rm -f .npmrc

# Set environment variables and ports
ARG NODE_ENV=production
ARG PORT=3000
ARG METRICS_PORT=3005

ENV NODE_ENV $NODE_ENV
ENV PORT $PORT
ENV METRICS_PORT $METRICS_PORT

# Expose ports
EXPOSE $PORT $METRICS_PORT 9229 9230

# Switch to non-root user for better security
USER node

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=3s --retries=5 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Run the application
CMD [ "npm", "run", "start", "-w=server" ]