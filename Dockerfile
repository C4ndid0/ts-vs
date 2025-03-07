FROM node:20

# Define o diretório de trabalho
WORKDIR /app

# Instala dependências necessárias para a ACBrLib no Linux
RUN apt-get update && apt-get install -y \
    libgtk2.0-0 \
    libssl-dev \
    xvfb \
    libxml2 \
    && rm -rf /var/lib/apt/lists/*

# Copia os arquivos do projeto
COPY package*.json ./
RUN npm install
COPY . .

# Copia a biblioteca e o .ini para o container
COPY lib/linux/libacbrcep64.so /app/lib/linux/
COPY ACBrLib.ini /app/

# Configura o Xvfb e inicia o servidor
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 & npm start"]