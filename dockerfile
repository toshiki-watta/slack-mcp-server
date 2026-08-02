FROM node:20-slim

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm install

COPY . .

# ポートの指定（Renderが注入するPORTを使用）
ENV PORT=8000
EXPOSE $PORT

CMD ["npm", "start"]
