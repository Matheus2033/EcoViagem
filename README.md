# 🌱 EcoViagem — Plataforma de Turismo Sustentável

Projeto da **A3 de Banco de Dados** (Universidade Anhembi Morumbi).
Tema: **Turismo Sustentável** — usar banco de dados para combater o alto impacto
ambiental do turismo, a superlotação de destinos e a falta de informação sobre
práticas sustentáveis.

A solução é uma plataforma onde o turista:
- descobre **destinos ranqueados por um índice de sustentabilidade**;
- encontra **hospedagens com certificação ambiental** e uso de energia renovável;
- **calcula a pegada de carbono** de cada viagem (por trecho de transporte);
- ajuda a **evitar superlotação** (o banco controla a capacidade diária do destino).

---

## 🧱 Arquitetura e tecnologias

```
┌──────────────┐    HTTP/JSON     ┌──────────────┐   JDBC (SQL)    ┌────────────────┐
│  Frontend    │ ───────────────▶ │     API      │ ──────────────▶ │   MySQL 8      │
│ React + Vite │   (proxy /api)   │ Spring Boot  │ usuário app_api  │  (Docker)      │
│  TypeScript  │ ◀─────────────── │ Java 21 +    │ ◀────────────── │  schema        │
│  Tailwind    │                  │ JdbcClient   │   menor privil.  │  ecoviagem     │
└──────────────┘                  └──────────────┘                 └────────────────┘
```

| Camada     | Tecnologia                                             |
|------------|--------------------------------------------------------|
| Banco      | MySQL 8 (em Docker)                                    |
| API        | Java 21 + Spring Boot 3.3 + Spring JDBC (`JdbcClient`, SQL puro) |
| Frontend   | React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + Recharts |
| Orquestração | Docker / docker-compose                              |

> Escolha de projeto: **MySQL 8** como SGBD e **Java/Spring Boot** no backend
> (conforme o mapa conceitual do Checkpoint 1). A API usa **SQL explícito** com
> `JdbcClient` (sem ORM) justamente para evidenciar modelagem, views, triggers,
> stored procedures e segurança do banco.

---

## 📁 Estrutura do repositório

```
ecoviagem/
├── docker-compose.yml          # sobe o MySQL e roda os scripts automaticamente
├── .env.example
├── database/
│   ├── 01_schema.sql           # DDL: tabelas, PK/FK, constraints, índices (3FN)
│   ├── 02_views.sql            # views de relatório e índice de sustentabilidade
│   ├── 03_functions_triggers.sql  # funções, triggers e stored procedure
│   ├── 04_security.sql         # roles e GRANT/REVOKE (perfis de acesso)
│   ├── 05_seed.sql             # dados de teste
│   ├── 06_consultas_relatorios.sql # consultas de relatório (rodar manualmente)
│   ├── DER.md                  # diagrama entidade-relacionamento + normalização
│   └── backup/                 # scripts de backup e restauração
├── backend-springboot/         # API REST (Java + Spring Boot + JDBC)
│   └── src/main/java/com/ecoviagem/
│       ├── controller/         # endpoints REST (camada fina)
│       ├── service/            # regras de negócio e transações
│       ├── repository/         # acesso a dados (SQL com JdbcClient)
│       ├── dto/                # objetos de requisição (records + validação)
│       ├── exception/          # exceções de domínio + handler global
│       └── config/             # CORS, BCrypt
└── frontend/                   # SPA React
    └── src/
        ├── api/                # cliente HTTP
        ├── types/              # tipos TypeScript
        ├── hooks/              # hooks (ex.: useAsync)
        ├── components/         # componentes de UI
        ├── context/            # contexto de autenticação
        ├── lib/                # animações (Framer Motion)
        └── pages/              # telas
```

> **Organização do código:** o backend segue a arquitetura em camadas
> **controller → service → repository**, com DTOs validados (`@Valid`) e um handler
> global de exceções. O frontend separa api/tipos/hooks/componentes/páginas.

---

## ▶️ Como executar

### Opção A — Tudo em um comando (só precisa de Docker) ⭐

Sobe banco + API (Java) + frontend (React) juntos:

```bash
cp .env.example .env
docker compose --profile full up --build -d
```

Depois abra **http://localhost:5173** no navegador. Não precisa ter Java, Node
ou Maven instalados — o Docker builda tudo. (O primeiro build baixa dependências
e leva alguns minutos.) Para parar: `docker compose --profile full down`.

> A aplicação é de 3 camadas (frontend → API → banco); este comando cuida das três.

### Opção B — Desenvolvimento (banco no Docker, API e front locais)

### 1) Subir o banco de dados no Docker (obrigatório)

```bash
cp .env.example .env
docker compose up -d db
```

Na primeira inicialização, o MySQL roda automaticamente os scripts `01` a `05`
(`/docker-entrypoint-initdb.d`), criando schema, tabelas, views, triggers, roles e
carga de teste. O banco fica em `localhost:3306` (banco `ecoviagem`).

Para recriar do zero (reexecutar todos os scripts):
```bash
docker compose down -v && docker compose up -d db
```

### 2) Rodar a API (Java + Spring Boot)

```bash
cd backend-springboot
mvn spring-boot:run          # http://localhost:8080
# ou: mvn clean package && java -jar target/ecoviagem-api-1.0.0.jar
```
A conexão usa as variáveis `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`
(padrões: `localhost:3306`, banco `ecoviagem`, usuário `app_api`).
Teste: `curl http://localhost:8080/api/health`

### 3) Rodar o frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```
Login de demonstração: **joao@email.com / senha123**

---

## 🗄️ O banco de dados em detalhe (entregáveis da A3)

### Modelagem (DER e 3FN)
17 tabelas normalizadas até a 3ª Forma Normal. Veja o diagrama completo em
[`database/DER.md`](database/DER.md). Entidades principais (as mesmas do mapa
conceitual): `usuario`, `destino`, `hospedagem`, `viagem`, `tipo_transporte`,
`reserva` e `pratica_sustentavel`; mais `atividade`, `avaliacao`, `trecho_transporte`
e tabelas de domínio/associativas (N:N) como `hospedagem_certificacao`,
`hospedagem_pratica` e `viagem_atividade`.

### Integridade referencial e constraints
- Chaves primárias e estrangeiras em todas as relações, com `ON DELETE`/`ON UPDATE` apropriados.
- `CHECK` (datas coerentes, notas 1–5, CPF com 11 dígitos, capacidade > 0, etc.).
- `UNIQUE` (e-mail, CPF, 1 avaliação por usuário/destino).

### Views (relatórios)
`vw_indice_sustentabilidade_destino`, `vw_pegada_carbono_viagem`,
`vw_hospedagens_certificadas`, `vw_avaliacoes_destino`, `vw_ocupacao_destino`.

### Funções, triggers e stored procedure
- **Trigger `trg_emissao_trecho`** → calcula automaticamente a emissão de CO₂ de cada trecho
  (`distância × pessoas × fator do transporte`).
- **Trigger `trg_valida_capacidade`** → impede superlotação do destino (regra de negócio).
- **Trigger `trg_audit_*`** → auditoria em `log_auditoria` (JSON); o trigger do MySQL executa no contexto do DEFINER.
- **Função `fn_pegada_total_viagem(id)`** → soma a pegada de uma viagem.
- **Procedure `sp_registrar_viagem(...)`** → registra viagem + trechos numa **transação**.

### Segurança e administração (GRANT/REVOKE)
Perfis de acesso: `perfil_admin`, `perfil_gestor`, `perfil_turista`, `perfil_bi`.
Usuários de banco: `app_api` (a API conecta com privilégios de turista — menor privilégio),
`gestor_maria`, `analista_bi`. Exemplos de `REVOKE` (gestor não apaga usuários/logs).

### Backup e recuperação
`database/backup/backup.sh` (mysqldump com --routines/--triggers, rotação de 7 dias) e
`database/backup/restore.sh` (restaura via `mysql`).

- **Trigger `trg_valor_reserva`** → calcula o valor total da reserva (diária × noites).

### Transações
A criação de viagem (`POST /api/viagens`, com `@Transactional` no serviço Spring,
e a procedure `sp_registrar_viagem`) roda em transação: insere viagem + trechos +
reserva; se uma trigger abortar (ex.: superlotação), tudo sofre ROLLBACK.

---

## 🔌 Endpoints principais da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | `/api/health` | status da conexão |
| POST | `/api/auth/register` · `/api/auth/login` | cadastro e login (bcrypt) |
| GET  | `/api/destinos` | lista com filtros `?categoria=&estado=&busca=` |
| GET  | `/api/destinos/:id` | detalhe (hospedagens, atividades, práticas, avaliações) |
| GET  | `/api/viagens?usuario=` | viagens do usuário + pegada + hospedagem reservada |
| POST | `/api/viagens` | cria viagem + trechos + reserva (transação) |
| GET  | `/api/reservas?usuario=` | reservas de hospedagem do usuário |
| POST | `/api/reservas` | cria uma reserva (valor calculado por trigger) |
| POST | `/api/avaliacoes` | avalia um destino |
| GET  | `/api/relatorios/*` | indicadores, sustentabilidade, transporte, ocupação |

---

## ✅ Mapeamento com os entregáveis da A3

| Entregável A3 | Onde está |
|---------------|-----------|
| Levantamento de requisitos | Este README + [`database/DER.md`](database/DER.md) |
| Modelagem conceitual/lógica (DER, 3FN) | [`database/DER.md`](database/DER.md), `01_schema.sql` |
| Arquitetura de dados (fontes, APIs, backup) | Seção *Arquitetura*, `backend-springboot/`, `database/backup/` |
| Código SQL (CREATE, constraints, índices, views, triggers, procedures, consultas) | `database/01`–`06` |
| Plano de segurança e administração (GRANT/REVOKE, backup, recuperação) | `04_security.sql`, `database/backup/` |
| Dados de teste (INSERTs) | `05_seed.sql` |

---

*Senhas presentes nos scripts são de demonstração — troque-as em produção.*
