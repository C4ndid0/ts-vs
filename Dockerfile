FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
COPY lib/linux/libacbrcep64.so /app/lib/linux/libacbrcep64.so
COPY ACBrLib.ini /app/ACBrLib.ini
RUN chmod +x /app/lib/linux/libacbrcep64.so
RUN mkdir -p /app/logs && chmod -R 777 /app/logs
RUN apt-get update && apt-get install -y \
    libffi-dev \
    libc6 \
    libssl-dev \
    libgtk2.0-0 \
    xvfb \
    gdb \
    && rm -rf /var/lib/apt/lists/*
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x16 & npm start"]