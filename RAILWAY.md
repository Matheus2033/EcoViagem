# 🚂 Deploy no Railway

Arquitetura recomendada: **backend + banco no Railway**, **frontend na Vercel**.
Os dois atualizam sozinhos a cada `git push` (deploy automático nativo).

```
Vercel (site React)  ──HTTPS──▶  Railway: API Spring Boot ──▶ Railway: MySQL
     usa VITE_API_URL
```

> **Por que o front na Vercel?** O `nginx.conf` do front foi feito para o
> `docker-compose` (faz proxy de `/api` para o container `api`). No Railway cada
> serviço é isolado, então o jeito limpo é o front chamar a API pela URL pública
> (`VITE_API_URL`) — e para servir uma SPA estática a Vercel é mais simples.
> Dá para pôr o front no Railway também, mas aí precisa adaptar o nginx.

---

## Por que a build falhava

O repositório é um **monorepo** (só pastas na raiz). O Railway builda **um
serviço por vez** e cada serviço precisa apontar para a subpasta certa pelo
**Root Directory**. Sem isso, o builder não acha projeto e falha.

---

## 1) Banco — MySQL

1. No projeto do Railway: **New → Database → Add MySQL**.
2. Abra o serviço MySQL → aba **Data** (ou conecte pelo Workbench/DBeaver com os
   dados de **Connect**) e rode os scripts da pasta `database/` **na ordem**:
   `01_schema.sql` → `02_views.sql` → `03_functions_triggers.sql` →
   `04_security.sql` → `05_seed.sql` → `07_seed_extra.sql`.
   - O `04_security.sql` cria o usuário de aplicação `app_api`. Se preferir
     simplicidade, pode pular ele e usar o usuário `root` do Railway no passo 2.

---

## 2) Backend (API Spring Boot)

1. **New → GitHub Repo** e selecione o repositório **EcoViagem**.
2. No serviço, **Settings → Source → Root Directory** = **`backend-springboot`**.
   - O `backend-springboot/railway.json` já fixa o build via **Dockerfile** e o
     healthcheck em `/api/health`.
3. **Variables** do serviço (use referências ao serviço MySQL):

   | Variável | Valor |
   |----------|-------|
   | `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
   | `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
   | `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
   | `DB_USER` | `app_api` *(ou `${{MySQL.MYSQLUSER}}` se usar o root)* |
   | `DB_PASSWORD` | senha do `app_api` *(ou `${{MySQL.MYSQLPASSWORD}}`)* |

   *(A porta pública é injetada pelo Railway via `PORT`; o app já lê isso.)*

   E-mail (opcional — sem isso o 2FA funciona em modo demonstração):
   `MAIL_ENABLED=true`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`,
   `MAIL_PASSWORD`, `MAIL_FROM`.
4. **Deploy**. Em **Settings → Networking → Generate Domain** você gera a URL
   pública, algo como `https://ecoviagem-api.up.railway.app`.
5. Teste: abra `https://SUA-API.up.railway.app/api/health` → deve responder
   `{"status":"ok","banco":"conectado",...}`.

---

## 3) Frontend (Vercel)

1. Em [vercel.com](https://vercel.com): **Add New → Project** e importe o repo.
2. **Root Directory** = **`frontend`** · Framework **Vite** (detectado).
3. **Environment Variables**:

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://SUA-API.up.railway.app/api` |
   | `VITE_GOOGLE_MAPS_API_KEY` | *(opcional)* sua chave |

4. **Deploy**. Pronto — o site fica em `https://seu-projeto.vercel.app`.

> Mudou `VITE_API_URL`? Faça **Redeploy** (variáveis `VITE_*` entram no build).

---

## Deploy automático

- **Backend (Railway)** e **Front (Vercel)** já ficam ligados ao GitHub: cada
  `git push` na branch escolhida dispara um novo deploy automático.

## Front no Railway (alternativa)

Se quiser tudo no Railway: crie outro serviço, Root Directory = `frontend`, e
defina a build arg / variável `VITE_API_URL` com a URL pública da API. Lembre
que o `nginx.conf` precisaria ouvir na porta `PORT` do Railway e não depender do
upstream `api` — por isso a Vercel é o caminho mais direto para o front.
