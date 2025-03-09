FROM node:20-alpine

WORKDIR /app

# Instala dependências disponíveis no Alpine
RUN apk add --no-cache \
    gtk+2.0 \
    libssl1.1 \
    xvfb \
    libxml2 \
    libc6-compat \
    libstdc++ \
    xvfb-run \
    build-base \
    python3

# Adiciona OpenSSL 1.0.x manualmente (não disponível no apk padrão)
# Baixa e instala libssl1.0.0 de um fonte confiável (exemplo simplificado)
RUN apk add --no-cache curl \
    && curl -L -o /tmp/openssl-1.0.2u.tar.gz https://www.openssl.org/source/old/1.0.2/openssl-1.0.2u.tar.gz \
    && tar -xzf /tmp/openssl-1.0.2u.tar.gz -C /tmp \
    && cd /tmp/openssl-1.0.2u \
    && ./config --prefix=/usr/local shared \
    && make -j$(nproc) \
    && make install \
    && ln -sf /usr/local/lib/libssl.so.1.0.2 /usr/lib/libssl.so.1.0.0 \
    && ln -sf /usr/local/lib/libcrypto.so.1.0.2 /usr/lib/libcrypto.so.1.0.0 \
    && rm -rf /tmp/openssl-1.0.2u*

COPY package*.json ./
RUN npm install
COPY . .

COPY lib/linux/libacbrcep64.so /app/lib/linux/
COPY ACBrLib.ini /app/

# Permissões e variáveis de ambiente
RUN chmod +x /app/lib/linux/libacbrcep64.so
ENV DISPLAY=:99
ENV LD_LIBRARY_PATH=/usr/lib:/app/lib/linux:/usr/local/lib:${LD_LIBRARY_PATH}

# Entrypoint simplificado
RUN echo '#!/bin/sh\nXvfb :99 -screen 0 1024x768x24 &\nnpm start' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]