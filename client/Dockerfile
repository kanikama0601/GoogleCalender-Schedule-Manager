# Development stage (ローカル開発用)
FROM node:20-slim AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Build stage (本番ビルド用)
FROM development AS build
# VITE_API_URL を指定せずにビルドすることで、フロントエンドは相対パス（/api）を使います
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production stage (本番配信用・Nginx)
FROM nginx:alpine AS production
# ビルドされた静的ファイルをNginxの公開フォルダにコピー
COPY --from=build /app/dist /usr/share/nginx/html

# SPA用設定 ＋ バックエンドへの通信中継（リバースプロキシ）設定
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://server:8000/; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
