# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Chave do Google Maps embutida no build do Vite (vazia por padrão → usa fallback).
ARG VITE_GOOGLE_MAPS_API_KEY=""
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN npm run build

# ---- Serve (nginx) ----
FROM nginx:alpine
# nginx.conf é um TEMPLATE: ${PORT} e ${API_URL} são resolvidos por envsubst na
# inicialização (recurso oficial da imagem: /etc/nginx/templates/*.template).
# Assim a mesma imagem roda no docker-compose (PORT=80) e no Railway (PORT
# injetado pela plataforma), sem precisar reconstruir.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
