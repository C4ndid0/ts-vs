# Usa Node.js 20 baseado em uma imagem slim para Linux
FROM node:20-slim

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de configuração de pacotes
COPY package.json package-lock.json ./

# Instala as dependências usando npm
RUN npm install

# Copia o restante do projeto
COPY . .

# Copia a biblioteca ACBr e o arquivo de configuração
COPY lib/linux/libacbrcep64.so /app/lib/linux/libacbrcep64.so
COPY ACBrLib.ini /app/ACBrLib.ini
RUN chmod +x /app/lib/linux/libacbrcep64.so

# Instala dependências do sistema, incluindo GTK+ e Xvfb
RUN apt-get update && apt-get install -y \
    libffi-dev \
    libc6 \
    libssl-dev \
    libgtk2.0-0 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Configura o Xvfb para rodar a aplicação sem display real
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x16 & npm start"]