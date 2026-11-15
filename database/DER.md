# Modelo de Dados — EcoViagem

## Diagrama Entidade-Relacionamento (DER)

> Renderiza no GitHub/VS Code (Mermaid). Para o relatório em PDF, use um print
> deste diagrama ou importe-o em uma ferramenta como o [dbdiagram.io](https://dbdiagram.io).

```mermaid
erDiagram
    CATEGORIA_DESTINO     ||--o{ DESTINO : classifica
    DESTINO               ||--o{ HOSPEDAGEM : possui
    TIPO_HOSPEDAGEM       ||--o{ HOSPEDAGEM : tipifica
    HOSPEDAGEM            ||--o{ HOSPEDAGEM_CERTIFICACAO : tem
    CERTIFICACAO_AMBIENTAL||--o{ HOSPEDAGEM_CERTIFICACAO : concede
    HOSPEDAGEM            ||--o{ HOSPEDAGEM_PRATICA : adota
    PRATICA_SUSTENTAVEL   ||--o{ HOSPEDAGEM_PRATICA : referenciada_em
    DESTINO               ||--o{ ATIVIDADE : oferece
    CATEGORIA_ATIVIDADE   ||--o{ ATIVIDADE : classifica
    USUARIO               ||--o{ VIAGEM : realiza
    DESTINO               ||--o{ VIAGEM : destino_de
    USUARIO               ||--o{ RESERVA : realiza
    HOSPEDAGEM            ||--o{ RESERVA : reservada_em
    VIAGEM                ||--o{ RESERVA : possui
    VIAGEM                ||--o{ TRECHO_TRANSPORTE : composta_por
    TIPO_TRANSPORTE       ||--o{ TRECHO_TRANSPORTE : usa
    VIAGEM                ||--o{ VIAGEM_ATIVIDADE : inclui
    ATIVIDADE             ||--o{ VIAGEM_ATIVIDADE : realizada_em
    USUARIO               ||--o{ AVALIACAO : escreve
    DESTINO               ||--o{ AVALIACAO : avaliado_em

    USUARIO {
        int      id_usuario PK
        varchar  nome
        varchar  email UK
        varchar  senha_hash
        char     cpf UK
        varchar  tipo_usuario
    }
    DESTINO {
        int      id_destino PK
        varchar  nome
        int      id_categoria FK
        varchar  cidade
        char     estado
        int      capacidade_maxima_diaria
    }
    HOSPEDAGEM {
        int      id_hospedagem PK
        int      id_destino FK
        int      id_tipo_hospedagem FK
        numeric  preco_diaria
        numeric  pegada_carbono_diaria
        bool     usa_energia_renovavel
    }
    VIAGEM {
        int      id_viagem PK
        int      id_usuario FK
        int      id_destino FK
        date     data_inicio
        date     data_fim
        int      num_pessoas
        varchar  status
    }
    RESERVA {
        int      id_reserva PK
        int      id_usuario FK
        int      id_hospedagem FK
        int      id_viagem FK
        date     data_checkin
        date     data_checkout
        int      num_hospedes
        numeric  valor_total
        varchar  status
    }
    TRECHO_TRANSPORTE {
        int      id_trecho PK
        int      id_viagem FK
        int      id_tipo_transporte FK
        numeric  distancia_km
        numeric  emissao_co2_kg
    }
    TIPO_TRANSPORTE {
        int      id_tipo_transporte PK
        varchar  nome
        numeric  fator_emissao_co2_km
    }
    AVALIACAO {
        int      id_avaliacao PK
        int      id_usuario FK
        int      id_destino FK
        smallint nota
        varchar  comentario
    }
    HOSPEDAGEM_CERTIFICACAO {
        int  id_hospedagem PK,FK
        int  id_certificacao PK,FK
        date data_emissao
        date data_validade
    }
    HOSPEDAGEM_PRATICA {
        int id_hospedagem PK,FK
        int id_pratica PK,FK
    }
    VIAGEM_ATIVIDADE {
        int id_viagem PK,FK
        int id_atividade PK,FK
    }
    CATEGORIA_DESTINO     { int id_categoria PK }
    TIPO_HOSPEDAGEM       { int id_tipo_hospedagem PK }
    CERTIFICACAO_AMBIENTAL{ int id_certificacao PK }
    CATEGORIA_ATIVIDADE   { int id_categoria_atividade PK }
    PRATICA_SUSTENTAVEL   { int id_pratica PK }
    ATIVIDADE             { int id_atividade PK }
```

## Entidades (resumo)

| Entidade | Papel |
|----------|-------|
| `categoria_destino`, `tipo_hospedagem`, `certificacao_ambiental`, `tipo_transporte`, `categoria_atividade`, `pratica_sustentavel` | Tabelas de domínio (lado "1") |
| `usuario` | Turistas, gestores e administradores |
| `destino` | Destinos turísticos (com capacidade diária) |
| `hospedagem` | Hospedagens de um destino (adotam práticas sustentáveis) |
| `atividade` | Atividades de um destino |
| `viagem` | Viagem de um usuário para um destino (usa transporte via trechos) |
| `reserva` | Reserva de hospedagem de um usuário (opcionalmente de uma viagem) |
| `trecho_transporte` | Deslocamentos de uma viagem (geram pegada de CO₂) |
| `avaliacao` | Nota/comentário de um usuário sobre um destino |
| `hospedagem_certificacao`, `hospedagem_pratica`, `viagem_atividade` | Associativas N:N |
| `log_auditoria` | Trilha de auditoria (preenchida por triggers) |

## Normalização (até a 3ª Forma Normal)

- **1FN** — todos os atributos são atômicos; não há grupos repetitivos. Listas
  (ex.: certificações e práticas de uma hospedagem, atividades de uma viagem) foram
  extraídas para **tabelas associativas** (`hospedagem_certificacao`,
  `hospedagem_pratica`, `viagem_atividade`).
- **2FN** — está em 1FN e não há dependências parciais. Nas tabelas com chave
  composta (associativas N:N), os atributos descritivos dependem da chave inteira
  (ex.: `data_emissao`/`data_validade` dependem do par hospedagem+certificação).
- **3FN** — não há dependências transitivas. Atributos como o **nome da categoria**,
  o **tipo de hospedagem** ou o **fator de emissão do transporte** ficam em suas
  próprias tabelas e são referenciados por FK, em vez de repetidos nas entidades
  principais. Assim, por exemplo, mudar o fator de emissão de um modal é feito em
  um único lugar (`tipo_transporte`).

Valores **derivados** (emissão de CO₂ do trecho, índice de sustentabilidade do
destino, pegada total da viagem) **não são armazenados de forma redundante**: são
calculados por **trigger** (no momento da escrita) ou por **view/função** (na
leitura), evitando anomalias de atualização.
