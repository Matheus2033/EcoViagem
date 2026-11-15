-- =============================================================================
-- EcoViagem - Plataforma de Turismo Sustentável
-- Script 01: ESQUEMA (DDL) - Tabelas, Chaves, Constraints e Índices
-- SGBD: MySQL 8
-- Modelagem normalizada até a 3ª Forma Normal (3FN)
-- =============================================================================

-- Recria o banco para execução idempotente em ambiente de desenvolvimento/avaliação.
-- Em produção isto NÃO deve ser feito.
DROP DATABASE IF EXISTS ecoviagem;
CREATE DATABASE ecoviagem CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE ecoviagem;
SET NAMES utf8mb4;

-- Observação: a collation utf8mb4_0900_ai_ci é "accent-insensitive" e
-- "case-insensitive", então e-mail e buscas por nome já são comparados sem
-- diferenciar maiúsculas/minúsculas e acentos (substitui o CITEXT/unaccent do PostgreSQL).

-- -----------------------------------------------------------------------------
-- TABELAS DE DOMÍNIO / LOOKUP (lado "1" dos relacionamentos)
-- -----------------------------------------------------------------------------

-- Categorias de destino (Praia, Montanha, Ecológico, Cultural, Rural...)
CREATE TABLE categoria_destino (
    id_categoria    INT          NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(60)  NOT NULL,
    descricao       VARCHAR(255),
    PRIMARY KEY (id_categoria),
    CONSTRAINT uq_categoria_destino_nome UNIQUE (nome)
) ENGINE=InnoDB;

-- Tipos de hospedagem (Hotel, Pousada, Eco-resort, Camping, Hostel...)
CREATE TABLE tipo_hospedagem (
    id_tipo_hospedagem  INT          NOT NULL AUTO_INCREMENT,
    nome                VARCHAR(60)  NOT NULL,
    PRIMARY KEY (id_tipo_hospedagem),
    CONSTRAINT uq_tipo_hospedagem_nome UNIQUE (nome)
) ENGINE=InnoDB;

-- Certificações ambientais (LEED, Green Key, ISO 14001...)
CREATE TABLE certificacao_ambiental (
    id_certificacao INT          NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(80)  NOT NULL,
    orgao_emissor   VARCHAR(100) NOT NULL,
    descricao       VARCHAR(255),
    PRIMARY KEY (id_certificacao),
    CONSTRAINT uq_certificacao_nome UNIQUE (nome)
) ENGINE=InnoDB;

-- Tipos de transporte com fator de emissão de CO2 (kg) por km por pessoa.
-- Esse fator é o coração do cálculo de pegada de carbono da viagem.
CREATE TABLE tipo_transporte (
    id_tipo_transporte   INT           NOT NULL AUTO_INCREMENT,
    nome                 VARCHAR(60)   NOT NULL,
    fator_emissao_co2_km DECIMAL(8,4)  NOT NULL  COMMENT 'kg CO2 / km / pessoa',
    PRIMARY KEY (id_tipo_transporte),
    CONSTRAINT uq_tipo_transporte_nome UNIQUE (nome),
    CONSTRAINT ck_fator_emissao_positivo CHECK (fator_emissao_co2_km >= 0)
) ENGINE=InnoDB;

-- Categorias de atividade turística (Trilha, Mergulho, Visita Cultural...)
CREATE TABLE categoria_atividade (
    id_categoria_atividade INT         NOT NULL AUTO_INCREMENT,
    nome                   VARCHAR(60) NOT NULL,
    PRIMARY KEY (id_categoria_atividade),
    CONSTRAINT uq_categoria_atividade_nome UNIQUE (nome)
) ENGINE=InnoDB;

-- Catálogo de práticas sustentáveis (reuso de água, energia solar, coleta seletiva...)
CREATE TABLE pratica_sustentavel (
    id_pratica  INT          NOT NULL AUTO_INCREMENT,
    nome        VARCHAR(100) NOT NULL,
    descricao   VARCHAR(255),
    categoria   VARCHAR(60)  NOT NULL  COMMENT 'Água / Energia / Resíduos / Social',
    PRIMARY KEY (id_pratica),
    CONSTRAINT uq_pratica_nome UNIQUE (nome)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- ENTIDADES PRINCIPAIS
-- -----------------------------------------------------------------------------

-- Usuários da plataforma (turistas, gestores de destino e administradores)
CREATE TABLE usuario (
    id_usuario      INT           NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(120)  NOT NULL,
    email           VARCHAR(255)  NOT NULL,              -- comparado sem diferenciar maiúsc./acentos
    senha_hash      VARCHAR(255)  NOT NULL,              -- NUNCA senha em texto puro
    cpf             CHAR(11),
    data_nascimento DATE,
    tipo_usuario    VARCHAR(15)   NOT NULL DEFAULT 'TURISTA',
    data_cadastro   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativo           BOOLEAN       NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuario_email_unico UNIQUE (email),
    CONSTRAINT uq_usuario_cpf UNIQUE (cpf),
    CONSTRAINT ck_usuario_email_vazio CHECK (email <> ''),
    CONSTRAINT ck_usuario_tipo CHECK (tipo_usuario IN ('TURISTA','GESTOR','ADMIN')),
    CONSTRAINT ck_usuario_cpf_digitos CHECK (cpf IS NULL OR cpf REGEXP '^[0-9]{11}$')
    -- Observação: data de nascimento no passado é validada na aplicação, pois o MySQL
    -- não permite funções não-determinísticas (CURRENT_DATE) em CHECK constraints.
) ENGINE=InnoDB;

-- Destinos turísticos
CREATE TABLE destino (
    id_destino               INT           NOT NULL AUTO_INCREMENT,
    nome                     VARCHAR(120)  NOT NULL,
    descricao                TEXT,
    id_categoria             INT           NOT NULL,
    cidade                   VARCHAR(80)   NOT NULL,
    estado                   CHAR(2)       NOT NULL,
    pais                     VARCHAR(60)   NOT NULL DEFAULT 'Brasil',
    latitude                 DECIMAL(9,6),
    longitude                DECIMAL(9,6),
    capacidade_maxima_diaria INT           NOT NULL  COMMENT 'turistas/dia (controle de superlotação)',
    data_cadastro            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_destino),
    CONSTRAINT fk_destino_categoria
        FOREIGN KEY (id_categoria) REFERENCES categoria_destino (id_categoria)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_destino_capacidade CHECK (capacidade_maxima_diaria > 0),
    CONSTRAINT ck_destino_lat CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
    CONSTRAINT ck_destino_lon CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

-- Hospedagens vinculadas a um destino
CREATE TABLE hospedagem (
    id_hospedagem           INT           NOT NULL AUTO_INCREMENT,
    id_destino              INT           NOT NULL,
    id_tipo_hospedagem      INT           NOT NULL,
    nome                    VARCHAR(120)  NOT NULL,
    endereco                VARCHAR(200),
    preco_diaria            DECIMAL(10,2) NOT NULL,
    capacidade              INT           NOT NULL,
    pegada_carbono_diaria   DECIMAL(8,2)  NOT NULL DEFAULT 0  COMMENT 'kg CO2 / diária',
    consumo_agua_litros_dia INT,
    usa_energia_renovavel   BOOLEAN       NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id_hospedagem),
    CONSTRAINT fk_hospedagem_destino
        FOREIGN KEY (id_destino) REFERENCES destino (id_destino)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_hospedagem_tipo
        FOREIGN KEY (id_tipo_hospedagem) REFERENCES tipo_hospedagem (id_tipo_hospedagem)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_hospedagem_preco CHECK (preco_diaria >= 0),
    CONSTRAINT ck_hospedagem_capacidade CHECK (capacidade > 0),
    CONSTRAINT ck_hospedagem_pegada CHECK (pegada_carbono_diaria >= 0)
) ENGINE=InnoDB;

-- Relacionamento N:N - Hospedagem possui Certificações (com validade)
CREATE TABLE hospedagem_certificacao (
    id_hospedagem   INT         NOT NULL,
    id_certificacao INT         NOT NULL,
    data_emissao    DATE        NOT NULL,
    data_validade   DATE,
    PRIMARY KEY (id_hospedagem, id_certificacao),
    CONSTRAINT fk_hc_hospedagem
        FOREIGN KEY (id_hospedagem) REFERENCES hospedagem (id_hospedagem)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_hc_certificacao
        FOREIGN KEY (id_certificacao) REFERENCES certificacao_ambiental (id_certificacao)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_hc_validade CHECK (data_validade IS NULL OR data_validade >= data_emissao)
) ENGINE=InnoDB;

-- Relacionamento N:N - Hospedagem adota Práticas Sustentáveis
-- (conforme o mapa conceitual: "HOSPEDAGEM adota PRÁTICA SUSTENTÁVEL")
CREATE TABLE hospedagem_pratica (
    id_hospedagem INT NOT NULL,
    id_pratica    INT NOT NULL,
    PRIMARY KEY (id_hospedagem, id_pratica),
    CONSTRAINT fk_hp_hospedagem
        FOREIGN KEY (id_hospedagem) REFERENCES hospedagem (id_hospedagem)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_hp_pratica
        FOREIGN KEY (id_pratica) REFERENCES pratica_sustentavel (id_pratica)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Atividades turísticas oferecidas em um destino
CREATE TABLE atividade (
    id_atividade           INT           NOT NULL AUTO_INCREMENT,
    id_destino             INT           NOT NULL,
    id_categoria_atividade INT           NOT NULL,
    nome                   VARCHAR(120)  NOT NULL,
    descricao              VARCHAR(255),
    impacto_ambiental      VARCHAR(10)   NOT NULL DEFAULT 'BAIXO',
    preco                  DECIMAL(10,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (id_atividade),
    CONSTRAINT fk_atividade_destino
        FOREIGN KEY (id_destino) REFERENCES destino (id_destino)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_atividade_categoria
        FOREIGN KEY (id_categoria_atividade) REFERENCES categoria_atividade (id_categoria_atividade)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_atividade_impacto CHECK (impacto_ambiental IN ('BAIXO','MEDIO','ALTO')),
    CONSTRAINT ck_atividade_preco CHECK (preco >= 0)
) ENGINE=InnoDB;

-- Viagens realizadas por um usuário para um destino (usa TRANSPORTE via trechos).
-- A hospedagem da viagem é representada pela entidade RESERVA (ver abaixo).
CREATE TABLE viagem (
    id_viagem      INT           NOT NULL AUTO_INCREMENT,
    id_usuario     INT           NOT NULL,
    id_destino     INT           NOT NULL,
    data_inicio    DATE          NOT NULL,
    data_fim       DATE          NOT NULL,
    num_pessoas    INT           NOT NULL DEFAULT 1,
    status         VARCHAR(12)   NOT NULL DEFAULT 'RESERVADA',
    data_registro  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_viagem),
    CONSTRAINT fk_viagem_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_viagem_destino
        FOREIGN KEY (id_destino) REFERENCES destino (id_destino)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_viagem_datas CHECK (data_fim >= data_inicio),
    CONSTRAINT ck_viagem_pessoas CHECK (num_pessoas > 0),
    CONSTRAINT ck_viagem_status CHECK (status IN ('RESERVADA','CONFIRMADA','CONCLUIDA','CANCELADA'))
) ENGINE=InnoDB;

-- Reservas de hospedagem (entidade do mapa conceitual):
-- "USUÁRIO realiza RESERVA" e "RESERVA pertence a HOSPEDAGEM".
-- Opcionalmente vinculada a uma viagem (id_viagem).
CREATE TABLE reserva (
    id_reserva     INT           NOT NULL AUTO_INCREMENT,
    id_usuario     INT           NOT NULL,
    id_hospedagem  INT           NOT NULL,
    id_viagem      INT,                                   -- opcional: reserva de uma viagem
    data_checkin   DATE          NOT NULL,
    data_checkout  DATE          NOT NULL,
    num_hospedes   INT           NOT NULL DEFAULT 1,
    valor_total    DECIMAL(10,2) NOT NULL DEFAULT 0  COMMENT 'calculado por trigger',
    status         VARCHAR(12)   NOT NULL DEFAULT 'RESERVADA',
    data_reserva   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_reserva),
    CONSTRAINT fk_reserva_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_reserva_hospedagem
        FOREIGN KEY (id_hospedagem) REFERENCES hospedagem (id_hospedagem)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reserva_viagem
        FOREIGN KEY (id_viagem) REFERENCES viagem (id_viagem)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_reserva_datas CHECK (data_checkout > data_checkin),
    CONSTRAINT ck_reserva_hospedes CHECK (num_hospedes > 0),
    CONSTRAINT ck_reserva_status CHECK (status IN ('RESERVADA','CONFIRMADA','CONCLUIDA','CANCELADA'))
) ENGINE=InnoDB;

-- Trechos de transporte de uma viagem (origem->destino em um modal).
-- A emissão de CO2 é calculada automaticamente por trigger (ver script 03).
CREATE TABLE trecho_transporte (
    id_trecho           INT           NOT NULL AUTO_INCREMENT,
    id_viagem           INT           NOT NULL,
    id_tipo_transporte  INT           NOT NULL,
    origem              VARCHAR(120)  NOT NULL,
    destino_trecho      VARCHAR(120)  NOT NULL,
    distancia_km        DECIMAL(10,2) NOT NULL,
    emissao_co2_kg      DECIMAL(12,2) NOT NULL DEFAULT 0  COMMENT 'preenchido via trigger',
    PRIMARY KEY (id_trecho),
    CONSTRAINT fk_trecho_viagem
        FOREIGN KEY (id_viagem) REFERENCES viagem (id_viagem)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_trecho_transporte
        FOREIGN KEY (id_tipo_transporte) REFERENCES tipo_transporte (id_tipo_transporte)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_trecho_distancia CHECK (distancia_km >= 0)
) ENGINE=InnoDB;

-- Relacionamento N:N - Atividades realizadas em uma viagem
CREATE TABLE viagem_atividade (
    id_viagem    INT NOT NULL,
    id_atividade INT NOT NULL,
    PRIMARY KEY (id_viagem, id_atividade),
    CONSTRAINT fk_va_viagem
        FOREIGN KEY (id_viagem) REFERENCES viagem (id_viagem)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_va_atividade
        FOREIGN KEY (id_atividade) REFERENCES atividade (id_atividade)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Avaliações de destinos feitas pelos usuários
CREATE TABLE avaliacao (
    id_avaliacao   INT          NOT NULL AUTO_INCREMENT,
    id_usuario     INT          NOT NULL,
    id_destino     INT          NOT NULL,
    nota           SMALLINT     NOT NULL,
    comentario     VARCHAR(500),
    data_avaliacao DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_avaliacao),
    CONSTRAINT fk_avaliacao_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_destino
        FOREIGN KEY (id_destino) REFERENCES destino (id_destino)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT ck_avaliacao_nota CHECK (nota BETWEEN 1 AND 5),
    -- Regra de negócio: um usuário avalia um destino uma única vez
    CONSTRAINT uq_avaliacao_usuario_destino UNIQUE (id_usuario, id_destino)
) ENGINE=InnoDB;

-- Tabela de auditoria (preenchida por triggers do script 03)
CREATE TABLE log_auditoria (
    id_log        BIGINT       NOT NULL AUTO_INCREMENT,
    tabela        VARCHAR(60)  NOT NULL,
    operacao      VARCHAR(10)  NOT NULL  COMMENT 'INSERT / UPDATE / DELETE',
    registro_id   VARCHAR(40),
    usuario_bd    VARCHAR(80),
    dados_antigos JSON,
    dados_novos   JSON,
    data_evento   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_log)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- ÍNDICES (além dos criados automaticamente por PK e UNIQUE)
-- Criados sobre colunas usadas em filtros, joins e ordenações frequentes.
-- -----------------------------------------------------------------------------
CREATE INDEX idx_destino_categoria       ON destino (id_categoria);
CREATE INDEX idx_destino_cidade_estado   ON destino (cidade, estado);
CREATE INDEX idx_hospedagem_destino      ON hospedagem (id_destino);
CREATE INDEX idx_hospedagem_tipo         ON hospedagem (id_tipo_hospedagem);
CREATE INDEX idx_atividade_destino       ON atividade (id_destino);
CREATE INDEX idx_viagem_usuario          ON viagem (id_usuario);
CREATE INDEX idx_viagem_destino          ON viagem (id_destino);
CREATE INDEX idx_viagem_status           ON viagem (status);
CREATE INDEX idx_viagem_periodo          ON viagem (data_inicio, data_fim);
CREATE INDEX idx_reserva_usuario         ON reserva (id_usuario);
CREATE INDEX idx_reserva_hospedagem      ON reserva (id_hospedagem);
CREATE INDEX idx_reserva_viagem          ON reserva (id_viagem);
CREATE INDEX idx_hospedagem_pratica_hosp ON hospedagem_pratica (id_hospedagem);
CREATE INDEX idx_trecho_viagem           ON trecho_transporte (id_viagem);
CREATE INDEX idx_avaliacao_destino       ON avaliacao (id_destino);
CREATE INDEX idx_log_tabela_data         ON log_auditoria (tabela, data_evento);
