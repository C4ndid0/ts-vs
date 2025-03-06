FROM node:16.20.2

# Instalar dependências do sistema, incluindo Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-dev \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json yarn.lock tsconfig.json ./

# Instalar dependências do Node.js
RUN yarn install --frozen-lockfile

# Copiar o restante do código
COPY . .

# Expor a porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["yarn", "dev"]