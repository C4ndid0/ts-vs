FROM node:20

WORKDIR /app

# Adiciona o repositório Debian Stretch para instalar libssl1.0.0
RUN echo "deb http://deb.debian.org/debian stretch main" >> /etc/apt/sources.list.d/stretch.list \
    && apt-get update \
    && apt-get install -y \
        libgtk2.0-0 \
        libssl1.0.0=1.0.2u-1~deb9u7 \
        xvfb \
        libxml2 \
    && rm -rf /var/lib/apt/lists/* \
    && rm /etc/apt/sources.list.d/stretch.list

COPY package*.json ./
RUN npm install
COPY . .

COPY lib/linux/libacbrcep64.so /app/lib/linux/
COPY ACBrLib.ini /app/

CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 & npm start"]