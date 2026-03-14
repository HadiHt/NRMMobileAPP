# Stage 1: Build the Expo Web app
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the app's source code
COPY . .

# Export the Expo project as a static web site
# This will output files to the "dist" directory
RUN npx expo export -p web

# Stage 2: Serve the app using Nginx
FROM nginx:alpine

# Build-time arguments
ARG COMMIT_SHA="unknown"
ARG COMMIT_MSG="unknown"
ARG BUILD_TIME="unknown"

# Set environment variables so they are available in the container
ENV APP_COMMIT_SHA=${COMMIT_SHA}
ENV APP_COMMIT_MSG=${COMMIT_MSG}
ENV APP_BUILD_TIME=${BUILD_TIME}

# Add labels for better Docker inspect visibility
LABEL org.opencontainers.image.revision=${COMMIT_SHA}
LABEL org.opencontainers.image.description=${COMMIT_MSG}
LABEL org.opencontainers.image.created=${BUILD_TIME}

# Copy the static web build from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a version.json file that can be accessed via the web
RUN echo "{\"sha\": \"${COMMIT_SHA}\", \"message\": \"${COMMIT_MSG}\", \"build_time\": \"${BUILD_TIME}\"}" > /usr/share/nginx/html/version.json

# Overwrite the default Nginx config with our custom SPA routing config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
