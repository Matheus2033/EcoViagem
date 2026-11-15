# ▲ Deploy do frontend na Vercel

A Vercel hospeda **só o frontend** (React/Vite). O **backend (Spring Boot)** e o
**MySQL** precisam rodar em outro lugar público com HTTPS — por exemplo a sua
**VPS Oracle** (veja [`DEPLOY.md`](DEPLOY.md)), ou Railway/Render.

```
Vercel (site React)  ──HTTPS──▶  Backend público (API + MySQL)
     usa VITE_API_URL
```

> ⚠️ Sem um backend público, o site abre mas **login e dados não funcionam**
> (as chamadas à API falham). Suba o backend primeiro.

---

## Pré-requisitos

1. O backend + MySQL rodando e acessível por **HTTPS** (ex.: `https://api.seu-dominio.com`).
   - Como o site da Vercel é HTTPS, o backend **também precisa ser HTTPS**
     (navegador bloqueia conteúdo misto). Na VPS, use o passo de HTTPS do `DEPLOY.md`.
   - O backend já libera CORS (`*`), então o front pode chamá-lo de outro domínio.
2. O repositório no GitHub (já está: `Matheus2033/EcoViagem`).

---

## Passo a passo (painel da Vercel)

1. Acesse [vercel.com](https://vercel.com) e faça login com o **GitHub**.
2. **Add New… ▸ Project** e importe o repositório **EcoViagem**.
3. Em **Configure Project**:
   - **Root Directory**: clique em *Edit* e selecione **`frontend`**. *(essencial — o site está nessa subpasta)*
   - **Framework Preset**: *Vite* (detectado automaticamente).
   - **Build Command** / **Output**: deixe o padrão (`npm run build` / `dist`).
4. **Environment Variables** (aba Environment Variables):
   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://SEU_BACKEND/api` (URL pública da API + `/api`) |
   | `VITE_GOOGLE_MAPS_API_KEY` | *(opcional)* sua chave do Google Maps |
5. **Deploy**. Em ~1 min o site fica no ar em `https://seu-projeto.vercel.app`.

> Mudou uma variável? Em **Settings ▸ Environment Variables**, salve e faça
> **Redeploy** (as variáveis `VITE_*` entram no build).

---

## Observações

- **Roteamento**: o `frontend/vercel.json` já manda qualquer rota para o
  `index.html` (SPA), então abrir `/rotas` direto ou dar F5 funciona.
- **Só o frontend?** Se quiser tudo em um lugar só (sem backend separado), use a
  **VPS Oracle** do [`DEPLOY.md`](DEPLOY.md) — lá o `docker compose` sobe site +
  API + banco juntos.
