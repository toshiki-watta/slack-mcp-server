FROM node:20-slim

WORKDIR /app

# パッケージ情報をコピーしてインストール
COPY package*.json ./
RUN npm install

# 全ファイルをコピー
COPY . .

# 起動コマンド（npm start経由でsupergatewayを実行）
CMD ["npm", "start"]
