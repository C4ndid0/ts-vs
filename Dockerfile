FROM node:16.20.2

# Install system dependencies, including GTK+ and Xvfb
RUN apt-get update && apt-get install -y \
    libgtk2.0-0 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files and install Node.js packages
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Start Xvfb and set the DISPLAY environment variable before running the app
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x16 & export DISPLAY=:99 && yarn dev"]