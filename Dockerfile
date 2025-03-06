FROM node:20.11.1

RUN apt-get update && apt-get install -y \
    libgtk2.0-0 \
    xvfb \
    python3 \
    python3-dev \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x16 & export DISPLAY=:99 && npm run dev"]