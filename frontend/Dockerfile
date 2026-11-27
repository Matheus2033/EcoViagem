# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Variáveis embutidas no build do Vite (precisam existir em tempo de build).
# - VITE_GOOGLE_MAPS_API_KEY: chave do Google Maps (vazia → usa fallback).
# - VITE_API_URL: URL pública da API quando o front é hospedado separado
#   (ex.: Railway/Vercel). Vazia → front usa /api (proxy do nginx no compose).
ARG VITE_GOOGLE_MAPS_API_KEY=""
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Serve (nginx) ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
