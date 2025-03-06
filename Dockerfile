FROM node:16-alpine
WORKDIR /app

# Instalar dependências do sistema (incluindo as sugeridas)
RUN apk add --no-cache \
    gdk-pixbuf \
    xvfb \
    xauth \
    openssl \
    libxml2 \
    ttf-dejavu && \
    ln -s /usr/lib/libxml2.so.2 /usr/lib/libxml2.so

# Copiar arquivos de configuração
COPY package.json yarn.lock tsconfig.json ./

# Instalar dependências com Yarn
RUN yarn install --frozen-lockfile

# Copiar código fonte e biblioteca
COPY src/ ./src/
COPY lib/ ./lib/

# Verificar se a biblioteca está presente
RUN ls -la lib/linux/ && test -f lib/linux/libacbrcep64.so || (echo "Error: libacbrcep64.so not found" && exit 1)

# Compilar TypeScript
RUN yarn build

EXPOSE 3000
CMD ["yarn", "start"]
