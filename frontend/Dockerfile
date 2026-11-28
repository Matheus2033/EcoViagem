# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Variáveis de build do Vite (embutidas no bundle gerado).
#  - VITE_GOOGLE_MAPS_API_KEY: chave do Google Maps (opcional).
#  - VITE_API_URL: endereço público da API em produção, ex.:
#    https://ecoviagem-production.up.railway.app/api
#    Vazio (local/docker-compose) → o front usa /api e o nginx faz o proxy.
ARG VITE_GOOGLE_MAPS_API_KEY=""
ARG VITE_API_URL=""
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Serve (nginx) ----
FROM nginx:alpine
# Defaults pra imagem subir sozinha; docker-compose e Railway sobrescrevem.
#  - PORT: porta onde o nginx escuta (Railway injeta a sua; local usa 80).
#  - API_URL: destino do proxy /api (usado só quando o front chama /api).
ENV PORT=8080
ENV API_URL=http://127.0.0.1:8080
# nginx.conf é um TEMPLATE: ${PORT} e ${API_URL} são resolvidos por envsubst na
# inicialização (recurso oficial da imagem: /etc/nginx/templates/*.template).
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
