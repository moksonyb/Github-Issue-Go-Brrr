FROM node:18-alpine

WORKDIR /app

# Install dependencies for USB support (if needed)
RUN apk add --no-cache \
    libudev-dev \
    eudev-dev \
    build-base \
    python3

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"] 