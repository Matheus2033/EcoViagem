# 🚀 Deploy do EcoViagem em uma VPS da Oracle Cloud

Guia passo a passo para colocar a aplicação (banco + API + site) rodando na web,
usando uma máquina virtual (VPS) da **Oracle Cloud Infrastructure (OCI)** com Docker.

A stack inteira sobe com **um comando** (`docker compose`). Não precisa instalar
Java, Node ou MySQL na máquina — só o Docker.

---

## 0) Visão geral

```
Navegador  ──HTTP──▶  VPS Oracle (porta 80)  ──▶  nginx (site)  ──/api──▶  API  ──▶  MySQL
```

- Só a porta do **site** (80, ou 443 com HTTPS) fica aberta na internet.
- API (8080) e banco (3306) ficam **internos** (acessíveis só dentro da VPS).

---

## 1) Pré-requisitos

- Uma conta na [Oracle Cloud](https://www.oracle.com/cloud/free/) (o tier **Always Free** basta).
- Um par de chaves **SSH** (o painel da Oracle gera uma na criação da VM, ou use a sua).
- (Opcional) Um **domínio** apontando para o IP da VPS, se quiser HTTPS bonito.

---

## 2) Criar a máquina virtual (instância)

1. No console da Oracle: **Menu ▸ Compute ▸ Instances ▸ Create instance**.
2. **Image and shape**:
   - **Image**: *Canonical Ubuntu 22.04*.
   - **Shape**: recomendo **Ampere (ARM) — VM.Standard.A1.Flex** com **2 OCPUs e 12 GB RAM**
     (está no Always Free e roda com folga). Todas as imagens Docker do projeto têm
     versão ARM, então funciona normalmente.
     - ⚠️ Se usar a micro x86 (**VM.Standard.E2.1.Micro**, 1 GB RAM), o *build* pode
       faltar memória — veja **Dica de memória (swap)** no fim.
3. **Add SSH keys**: salve a chave privada (`.key`) que a Oracle oferecer, ou cole a sua pública.
4. **Networking**: deixe criar uma VCN nova e **atribua um IP público**.
5. **Create**. Anote o **Public IP address** da instância.

---

## 3) Liberar as portas (duas camadas de firewall!)

A Oracle tem **dois** firewalls. Precisa abrir a porta nos **dois**.

### 3a) Firewall da nuvem (VCN — Security List)

1. **Networking ▸ Virtual Cloud Networks ▸ (sua VCN) ▸ Subnets ▸ (sua subnet) ▸ Security Lists ▸ Default Security List**.
2. **Add Ingress Rules** e adicione:
   | Source CIDR | IP Protocol | Destination Port |
   |-------------|-------------|------------------|
   | `0.0.0.0/0` | TCP         | `80`             |
   | `0.0.0.0/0` | TCP         | `443` (se for usar HTTPS) |

### 3b) Firewall da instância (iptables)

Conecte por SSH (passo 4) e rode:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

> Confira com `sudo iptables -L INPUT --line-numbers`. A regra precisa ficar **antes**
> da regra de REJECT. (Em Oracle Linux, use `firewall-cmd --add-port=80/tcp --permanent` e `--reload`.)

---

## 4) Conectar na VPS por SSH

No seu computador (troque o caminho da chave e o IP):

```bash
ssh -i caminho/para/sua-chave.key ubuntu@SEU_IP_PUBLICO
```

(No Windows, use o PowerShell/Git Bash com o mesmo comando, ou o PuTTY.)

---

## 5) Instalar Docker

```bash
sudo apt-get update
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Saia e entre de novo no SSH (`exit` e reconecte) para o grupo `docker` valer. Teste:

```bash
docker --version && docker compose version
```

---

## 6) Clonar o repositório

```bash
sudo apt-get install -y git
git clone https://github.com/Matheus2033/EcoViagem.git
cd EcoViagem
```

---

## 7) Configurar o ambiente (.env)

```bash
cp .env.example .env
nano .env
```

Ajuste no mínimo (⚠️ troque as senhas por valores fortes):

```bash
MYSQL_ROOT_PASSWORD=UMA_SENHA_ROOT_FORTE
DB_PASSWORD=UMA_SENHA_APP_FORTE
WEB_PORT=80          # serve o site na porta 80 (web)

# (opcionais)
# VITE_GOOGLE_MAPS_API_KEY=sua-chave-do-google-maps
# MAIL_ENABLED=true
# MAIL_HOST=smtp.gmail.com
# MAIL_USERNAME=seu-email@gmail.com
# MAIL_PASSWORD=sua-senha-de-app
# MAIL_FROM=EcoViagem <seu-email@gmail.com>
```

> ⚠️ Se mudar `DB_PASSWORD`, ela tem que bater com o usuário `app_api` criado no
> `database/04_security.sql`. Para um começo rápido, mantenha os valores padrão do
> `.env.example` (só troque `MYSQL_ROOT_PASSWORD`). Para trocar a senha do `app_api`,
> edite o `04_security.sql` **antes** do primeiro `up` (ele roda na primeira vez).
> Salve no nano com `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 8) Subir tudo

```bash
docker compose --profile full up --build -d
```

O primeiro build baixa dependências e leva alguns minutos. Acompanhe com:

```bash
docker compose --profile full ps
docker compose --profile full logs -f api
```

Quando o banco ficar `healthy` e a API logar *Started*, está no ar.

---

## 9) Acessar

Abra no navegador:

```
http://SEU_IP_PUBLICO
```

Login de demonstração: **joao@email.com / senha123** (o código 2FA aparece na tela
em modo demonstração enquanto o SMTP não estiver configurado).

---

## 10) (Opcional) Domínio + HTTPS

Com um domínio apontando (registro **A**) para o IP da VPS, o jeito mais simples de
ter HTTPS automático é pôr um **Caddy** na frente:

1. No `.env`, volte o site para uma porta interna: `WEB_PORT=8081`.
2. Crie `Caddyfile` na pasta do projeto:
   ```
   seu-dominio.com {
       reverse_proxy localhost:8081
   }
   ```
3. Rode o Caddy (ele emite o certificado Let's Encrypt sozinho):
   ```bash
   docker run -d --name caddy --restart unless-stopped --network host \
     -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
     -v caddy_data:/data \
     caddy:2
   ```
4. Abra a porta **443** na VCN e no iptables (passo 3). Pronto: `https://seu-dominio.com`.

---

## 11) Comandos do dia a dia

```bash
# status / logs
docker compose --profile full ps
docker compose --profile full logs -f

# atualizar para a versão mais nova do GitHub
git pull
docker compose --profile full up --build -d

# parar / iniciar
docker compose --profile full down
docker compose --profile full up -d

# recriar o banco do zero (APAGA os dados!)
docker compose --profile full down -v && docker compose --profile full up --build -d
```

### Backup do banco

```bash
docker exec ecoviagem_db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --routines --triggers ecoviagem' > backup_ecoviagem.sql
```

---

## 12) Dica de memória (swap) — só na micro de 1 GB

Se usar a instância de 1 GB de RAM, crie 2 GB de swap para o build não faltar memória:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 13) Problemas comuns

| Sintoma | Causa provável | Solução |
|--------|-----------------|---------|
| Site não abre no IP | Porta 80 fechada | Abra 80 na **VCN** *e* no **iptables** (passo 3) |
| Build morre / "Killed" | Falta de RAM | Use a shape Ampere A1, ou crie swap (passo 12) |
| `app_api` não conecta | Senha divergente | `DB_PASSWORD` tem que bater com o `04_security.sql` |
| Site sem estilo em navegador antigo | Cache | `Ctrl+Shift+R` (a build já é compatível com navegadores antigos) |

---

Pronto! Com isso o EcoViagem roda 24/7 na web, acessível por qualquer navegador
(Chrome, Edge, Firefox, Safari, Brave). 🌱
