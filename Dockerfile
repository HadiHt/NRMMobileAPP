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

# Copy the static web build from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
