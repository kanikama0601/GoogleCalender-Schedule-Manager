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
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production stage (本番配信用・Nginx)
FROM nginx:alpine AS production
# ビルドされた静的ファイルをNginxの公開フォルダにコピー
COPY --from=build /app/dist /usr/share/nginx/html

# SPA（React Router等）のリロード対策用カスタム設定を書き込む
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
