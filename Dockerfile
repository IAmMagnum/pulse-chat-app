# Use official Node.js runtime as parent image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all application source code
COPY . .

# Expose server port
EXPOSE 3000

# Start the full-stack server
CMD ["node", "server.js"]