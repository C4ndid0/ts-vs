FROM ubuntu:20.04

WORKDIR /app

# Instala dependências e adiciona repositório Bionic pra libssl1.0.0
RUN apt-get update \
    && apt-get install -y curl \
    && echo "deb http://archive.ubuntu.com/ubuntu bionic main universe" >> /etc/apt/sources.list.d/bionic.list \
    && apt-get update \
    && apt-get install -y \
        libgtk2.0-0 \
        libssl1.0.0 \
        xvfb \
        libxml2 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && rm /etc/apt/sources.list.d/bionic.list

COPY package*.json ./
RUN npm install
COPY . .

COPY lib/linux/libacbrcep64.so /app/lib/linux/
COPY ACBrLib.ini /app/

CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 & npm start"]