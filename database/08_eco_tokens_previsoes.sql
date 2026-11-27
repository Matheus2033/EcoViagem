-- =============================================================================
-- EcoViagem - Script 08: ECO TOKENS (gamificação) + PREVISÃO DE RISCO AMBIENTAL
-- MySQL 8. Executado no primeiro init (após 07) e aplicável manualmente no banco
-- já ativo (usa IF NOT EXISTS / DROP ... IF EXISTS).
--
--  * acao_sustentavel   catálogo de práticas que o turista pode relatar (vale tokens)
--  * registro_acao      relato do usuário (trigger define tokens e limite diário)
--  * recompensa         catálogo de viagens/descontos trocáveis por tokens
--  * resgate            troca de tokens (trigger valida saldo e estoque)
--  * vw_saldo_tokens    saldo = tokens ganhos − tokens gastos
--  * ecossistema_risco  parâmetros do modelo de previsão de colapso ambiental
-- =============================================================================
USE ecoviagem;
SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1) TABELAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS acao_sustentavel (
    id_acao        INT           NOT NULL AUTO_INCREMENT,
    nome           VARCHAR(100)  NOT NULL,
    descricao      VARCHAR(255)  NOT NULL,
    categoria      VARCHAR(30)   NOT NULL,
    icone          VARCHAR(8)    NOT NULL DEFAULT '🌱',
    tokens         INT           NOT NULL,
    limite_diario  INT           NOT NULL DEFAULT 1 COMMENT 'máx. relatos por usuário/dia',
    co2_evitado_kg DECIMAL(8,2)  NOT NULL DEFAULT 0 COMMENT 'estimativa por relato',
    PRIMARY KEY (id_acao),
    CONSTRAINT uq_acao_nome UNIQUE (nome),
    CONSTRAINT ck_acao_tokens CHECK (tokens > 0),
    CONSTRAINT ck_acao_limite CHECK (limite_diario > 0),
    CONSTRAINT ck_acao_categoria CHECK (categoria IN ('Transporte','Resíduos','Água','Energia','Comunidade','Natureza'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS registro_acao (
    id_registro    INT           NOT NULL AUTO_INCREMENT,
    id_usuario     INT           NOT NULL,
    id_acao        INT           NOT NULL,
    id_viagem      INT           NULL COMMENT 'opcional: viagem em que a prática ocorreu',
    descricao      VARCHAR(500),
    tokens_ganhos  INT           NOT NULL DEFAULT 0 COMMENT 'preenchido pela trigger',
    data_registro  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_registro),
    CONSTRAINT fk_registro_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_registro_acao FOREIGN KEY (id_acao) REFERENCES acao_sustentavel (id_acao)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_registro_viagem FOREIGN KEY (id_viagem) REFERENCES viagem (id_viagem)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_registro_usuario_data (id_usuario, data_registro)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recompensa (
    id_recompensa  INT           NOT NULL AUTO_INCREMENT,
    nome           VARCHAR(120)  NOT NULL,
    descricao      VARCHAR(255)  NOT NULL,
    tipo           VARCHAR(15)   NOT NULL,
    icone          VARCHAR(8)    NOT NULL DEFAULT '🎁',
    custo_tokens   INT           NOT NULL,
    estoque        INT           NOT NULL DEFAULT 100,
    parceiro       VARCHAR(120),
    id_destino     INT           NULL,
    ativo          BOOLEAN       NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_recompensa),
    CONSTRAINT fk_recompensa_destino FOREIGN KEY (id_destino) REFERENCES destino (id_destino)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_recompensa_tipo CHECK (tipo IN ('VIAGEM','DESCONTO','HOSPEDAGEM','EXPERIENCIA','DOACAO')),
    CONSTRAINT ck_recompensa_custo CHECK (custo_tokens > 0),
    CONSTRAINT ck_recompensa_estoque CHECK (estoque >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resgate (
    id_resgate     INT           NOT NULL AUTO_INCREMENT,
    id_usuario     INT           NOT NULL,
    id_recompensa  INT           NOT NULL,
    tokens_gastos  INT           NOT NULL DEFAULT 0 COMMENT 'preenchido pela trigger',
    codigo_voucher CHAR(12)      NOT NULL,
    data_resgate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_resgate),
    CONSTRAINT uq_resgate_voucher UNIQUE (codigo_voucher),
    CONSTRAINT fk_resgate_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_resgate_recompensa FOREIGN KEY (id_recompensa) REFERENCES recompensa (id_recompensa)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_resgate_usuario (id_usuario)
) ENGINE=InnoDB;

-- Parâmetros do modelo de previsão (ver PrevisaoService no backend).
CREATE TABLE IF NOT EXISTS ecossistema_risco (
    id_ecossistema       INT           NOT NULL AUTO_INCREMENT,
    nome                 VARCHAR(120)  NOT NULL,
    localizacao          VARCHAR(120)  NOT NULL,
    pais                 VARCHAR(60)   NOT NULL,
    tipo                 VARCHAR(40)   NOT NULL,
    latitude             DECIMAL(9,6),
    longitude            DECIMAL(9,6),
    saude_atual          DECIMAL(5,2)  NOT NULL COMMENT '0–100: integridade ecológica estimada hoje',
    taxa_degradacao      DECIMAL(5,2)  NOT NULL COMMENT '% ao ano na tendência atual de poluição/aquecimento',
    sensibilidade        DECIMAL(4,2)  NOT NULL COMMENT '0–1: quanto a taxa reage à variação da poluição',
    ameaca_principal     VARCHAR(160)  NOT NULL,
    evidencia            VARCHAR(255)  NOT NULL,
    fonte                VARCHAR(160)  NOT NULL,
    id_destino           INT           NULL COMMENT 'liga ao destino da plataforma, se houver',
    PRIMARY KEY (id_ecossistema),
    CONSTRAINT uq_ecossistema_nome UNIQUE (nome),
    CONSTRAINT fk_ecossistema_destino FOREIGN KEY (id_destino) REFERENCES destino (id_destino)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_ecossistema_saude CHECK (saude_atual BETWEEN 0 AND 100),
    CONSTRAINT ck_ecossistema_taxa CHECK (taxa_degradacao >= 0),
    CONSTRAINT ck_ecossistema_sens CHECK (sensibilidade BETWEEN 0 AND 1)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2) VIEW de saldo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_saldo_tokens AS
SELECT u.id_usuario,
       COALESCE(g.ganhos, 0)                         AS tokens_ganhos,
       COALESCE(s.gastos, 0)                         AS tokens_gastos,
       COALESCE(g.ganhos, 0) - COALESCE(s.gastos, 0) AS saldo,
       COALESCE(g.qtd, 0)                            AS qtd_acoes,
       COALESCE(g.co2, 0)                            AS co2_evitado_kg
FROM usuario u
LEFT JOIN (SELECT r.id_usuario, SUM(r.tokens_ganhos) AS ganhos, COUNT(*) AS qtd,
                  SUM(a.co2_evitado_kg) AS co2
           FROM registro_acao r JOIN acao_sustentavel a ON a.id_acao = r.id_acao
           GROUP BY r.id_usuario) g ON g.id_usuario = u.id_usuario
LEFT JOIN (SELECT id_usuario, SUM(tokens_gastos) AS gastos
           FROM resgate GROUP BY id_usuario) s ON s.id_usuario = u.id_usuario;

-- -----------------------------------------------------------------------------
-- 3) TRIGGERS (regras de negócio no banco)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_registro_acao_ins;
DROP TRIGGER IF EXISTS trg_resgate_ins;

DELIMITER $$

-- Define os tokens pela tabela de ações e bloqueia relatos acima do limite diário.
CREATE TRIGGER trg_registro_acao_ins
BEFORE INSERT ON registro_acao FOR EACH ROW
BEGIN
    DECLARE v_tokens INT;
    DECLARE v_limite INT;
    DECLARE v_hoje   INT;

    SELECT tokens, limite_diario INTO v_tokens, v_limite
    FROM acao_sustentavel WHERE id_acao = NEW.id_acao;

    SELECT COUNT(*) INTO v_hoje
    FROM registro_acao
    WHERE id_usuario = NEW.id_usuario AND id_acao = NEW.id_acao
      AND DATE(data_registro) = CURRENT_DATE;

    IF v_hoje >= v_limite THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Limite diário desta prática atingido. Volte amanhã!';
    END IF;

    SET NEW.tokens_ganhos = v_tokens;
END$$

-- Valida saldo e estoque, registra o custo e baixa o estoque da recompensa.
CREATE TRIGGER trg_resgate_ins
BEFORE INSERT ON resgate FOR EACH ROW
BEGIN
    DECLARE v_custo   INT;
    DECLARE v_estoque INT;
    DECLARE v_ativo   BOOLEAN;
    DECLARE v_saldo   INT;

    SELECT custo_tokens, estoque, ativo INTO v_custo, v_estoque, v_ativo
    FROM recompensa WHERE id_recompensa = NEW.id_recompensa FOR UPDATE;

    IF v_ativo = FALSE OR v_estoque <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recompensa esgotada ou indisponível.';
    END IF;

    SELECT saldo INTO v_saldo FROM vw_saldo_tokens WHERE id_usuario = NEW.id_usuario;
    IF COALESCE(v_saldo, 0) < v_custo THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo de EcoTokens insuficiente.';
    END IF;

    SET NEW.tokens_gastos = v_custo;
    UPDATE recompensa SET estoque = estoque - 1 WHERE id_recompensa = NEW.id_recompensa;
END$$

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4) PRIVILÉGIOS (menor privilégio para a API / perfil turista)
--    As triggers rodam com os privilégios do DEFINER, então a API não precisa de
--    UPDATE em recompensa para baixar o estoque.
-- -----------------------------------------------------------------------------
GRANT SELECT          ON ecoviagem.acao_sustentavel  TO perfil_turista;
GRANT SELECT          ON ecoviagem.recompensa        TO perfil_turista;
GRANT SELECT          ON ecoviagem.ecossistema_risco TO perfil_turista;
GRANT SELECT          ON ecoviagem.vw_saldo_tokens   TO perfil_turista;
GRANT SELECT, INSERT  ON ecoviagem.registro_acao     TO perfil_turista;
GRANT SELECT, INSERT  ON ecoviagem.resgate           TO perfil_turista;
GRANT SELECT          ON ecoviagem.registro_acao     TO perfil_bi;
GRANT SELECT          ON ecoviagem.resgate           TO perfil_bi;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.acao_sustentavel  TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.recompensa        TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.ecossistema_risco TO perfil_gestor;

-- -----------------------------------------------------------------------------
-- 5) CARGA INICIAL
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO acao_sustentavel (nome, descricao, categoria, icone, tokens, limite_diario, co2_evitado_kg) VALUES
 ('Fui de transporte público',      'Usei ônibus, metrô ou trem em vez de carro/app',          'Transporte', '🚌', 15, 2, 2.50),
 ('Pedalei ou caminhei',            'Troquei um trajeto motorizado por bicicleta ou a pé',      'Transporte', '🚲', 20, 2, 3.80),
 ('Carona compartilhada',           'Dividi o carro com outros viajantes',                     'Transporte', '🚗', 10, 1, 1.90),
 ('Escolhi ônibus/trem em vez de avião', 'Trecho longo feito por terra',                       'Transporte', '🚆', 80, 1, 90.00),
 ('Usei garrafa reutilizável',      'Evitei comprar garrafas plásticas descartáveis',         'Resíduos',   '🧴',  5, 1, 0.08),
 ('Recolhi lixo em trilha/praia',   'Participei de limpeza ou recolhi resíduos no caminho',    'Natureza',   '🧹', 30, 1, 0.50),
 ('Separei o lixo para reciclagem', 'Fiz coleta seletiva durante a viagem',                   'Resíduos',   '♻️', 10, 1, 0.30),
 ('Banho curto (até 5 min)',        'Economizei água na hospedagem',                          'Água',       '🚿',  5, 1, 0.20),
 ('Reusei toalhas e roupa de cama', 'Dispensei a troca diária na hospedagem',                 'Água',       '🛏️',  5, 1, 0.40),
 ('Desliguei ar-condicionado e luzes','Economia de energia ao sair do quarto',                'Energia',    '💡',  5, 1, 0.70),
 ('Comprei de produtor local',      'Comida, artesanato ou serviço de moradores',             'Comunidade', '🧺', 15, 2, 0.60),
 ('Contratei guia local credenciado','Turismo de base comunitária',                           'Comunidade', '🧭', 25, 1, 0.00),
 ('Respeitei trilhas e a fauna',    'Não alimentei animais e não saí das trilhas oficiais',   'Natureza',   '🦜', 10, 1, 0.00),
 ('Fiquei em hospedagem certificada','Hospedagem com selo ambiental (Green Key, ISO 14001…)', 'Energia',    '🏡', 40, 1, 5.00);

INSERT INTO recompensa (nome, descricao, tipo, icone, custo_tokens, estoque, parceiro, id_destino)
SELECT * FROM (
 SELECT '10% off em hospedagem certificada' AS nome, 'Cupom para qualquer hospedagem com selo ambiental da plataforma' AS descricao, 'DESCONTO' AS tipo, '🏷️' AS icone, 150 AS custo, 500 AS est, 'Rede EcoViagem' AS parc, NULL AS dest
 UNION ALL SELECT '20% off em passagem de ônibus',      'Desconto em trechos rodoviários de até 1.000 km',                'DESCONTO',    '🚌', 200, 300, 'Parceiros rodoviários', NULL
 UNION ALL SELECT 'Passeio guiado no Rio da Prata',      'Flutuação com guia local credenciado em Bonito',                 'EXPERIENCIA', '🐠', 450,  40, 'Guias de Bonito', (SELECT id_destino FROM destino WHERE nome='Bonito')
 UNION ALL SELECT 'Trilha guiada no Vale do Pati',       'Um dia de trekking com guia da comunidade',                      'EXPERIENCIA', '🥾', 400,  30, 'Associação de Guias do Pati', (SELECT id_destino FROM destino WHERE nome='Chapada Diamantina')
 UNION ALL SELECT '1 diária na Pousada Farol da Ilha',   'Diária para 2 pessoas na Ilha do Mel (sem carros!)',            'HOSPEDAGEM',  '🏝️', 800,  15, 'Pousada Farol da Ilha', (SELECT id_destino FROM destino WHERE nome='Ilha do Mel')
 UNION ALL SELECT '2 diárias no Hostel Vale do Pati',    'Hospedagem com energia solar na Chapada Diamantina',             'HOSPEDAGEM',  '🏕️', 600,  20, 'Hostel Vale do Pati', (SELECT id_destino FROM destino WHERE nome='Chapada Diamantina')
 UNION ALL SELECT 'Pacote fim de semana na Ilha Grande', 'Ônibus + barco + 2 diárias em hostel parceiro',                  'VIAGEM',      '⛴️', 1500, 10, 'Hostel Vila do Abraão', (SELECT id_destino FROM destino WHERE nome='Ilha Grande')
 UNION ALL SELECT 'Viagem para a Chapada dos Veadeiros', 'Transporte coletivo + 3 diárias + trilha guiada',                'VIAGEM',      '🌄', 2500,  5, 'Pousada Trilha do Cerrado', (SELECT id_destino FROM destino WHERE nome='Chapada dos Veadeiros')
 UNION ALL SELECT 'Plante 5 árvores na Mata Atlântica',  'Doação convertida em mudas nativas em área de restauração',       'DOACAO',      '🌳', 100, 9999, 'Projeto de restauração parceiro', NULL
 UNION ALL SELECT 'Adote 1 m² de recife de coral',       'Doação para restauração de corais em Abrolhos',                  'DOACAO',      '🪸', 120, 9999, 'Projeto de conservação marinha', NULL
) t
WHERE NOT EXISTS (SELECT 1 FROM recompensa);

-- Parâmetros do modelo. A saúde atual e a taxa anual são ESTIMATIVAS ILUSTRATIVAS,
-- calibradas qualitativamente a partir das evidências citadas (não são medições
-- oficiais do ecossistema inteiro). Servem para comparar cenários de poluição.
INSERT IGNORE INTO ecossistema_risco
 (nome, localizacao, pais, tipo, latitude, longitude, saude_atual, taxa_degradacao, sensibilidade, ameaca_principal, evidencia, fonte, id_destino) VALUES
 ('Grande Barreira de Corais', 'Queensland', 'Austrália', 'Recife de coral', -18.286000, 147.700000, 45, 3.20, 0.90,
  'Branqueamento por ondas de calor marinhas',
  'Branqueamentos em massa em 2016, 2017, 2020, 2022, 2024 e 2025; algumas áreas perderam mais de 70% da cobertura de coral.',
  'IPCC SR1.5 (2018); Global Tipping Points Report (2025)', NULL),
 ('Recifes de Abrolhos', 'Caravelas, BA', 'Brasil', 'Recife de coral', -17.960000, -38.700000, 60, 2.30, 0.85,
  'Aquecimento do oceano e sedimentos de origem terrestre',
  'O evento global de branqueamento de 2023–2025 expôs cerca de 84% da área de recifes do planeta a calor de branqueamento.',
  'NOAA Coral Reef Watch (2025)', NULL),
 ('Pantanal', 'MS / MT', 'Brasil', 'Área úmida', -18.000000, -57.000000, 62, 1.90, 0.70,
  'Incêndios e secas prolongadas no Rio Paraguai',
  'Em 2024 a área queimada no Pantanal ficou 157% acima da média histórica (≈1,9 milhão de hectares).',
  'MapBiomas Fogo, Relatório Anual 2024', NULL),
 ('Amazônia (arco do desmatamento)', 'Sul do PA / norte do MT', 'Brasil', 'Floresta tropical', -7.000000, -55.000000, 68, 1.30, 0.75,
  'Desmatamento, fogo e degradação',
  'A Amazônia teve 15,6 milhões de hectares queimados em 2024, o maior valor da série desde 1985; em 2025 caiu ao menor nível registrado.',
  'MapBiomas Fogo (2024 e 2025)', NULL),
 ('Fernando de Noronha', 'PE', 'Brasil', 'Ilha oceânica', -3.854000, -32.423400, 76, 0.90, 0.60,
  'Lixo plástico marinho e pressão turística',
  'Segundo o PNUMA, 19 a 23 milhões de toneladas de plástico chegam a rios, lagos e mares a cada ano.',
  'PNUMA – Plastic Pollution', (SELECT id_destino FROM destino WHERE nome='Fernando de Noronha')),
 ('Rios cristalinos de Bonito', 'MS', 'Brasil', 'Rio de água clara', -21.129500, -56.482100, 78, 1.10, 0.80,
  'Assoreamento e turbidez por uso agrícola do solo',
  'Episódios de turbidez em rios como o da Prata após chuvas fortes ligam-se a solo exposto nas bacias.',
  'Imprensa regional e órgãos ambientais do MS', (SELECT id_destino FROM destino WHERE nome='Bonito')),
 ('Lençóis Maranhenses', 'MA', 'Brasil', 'Dunas e lagoas', -2.754900, -42.826500, 82, 0.70, 0.55,
  'Mudança no regime de chuvas que enche as lagoas',
  'As lagoas dependem da chuva sazonal; o aquecimento altera a frequência e a intensidade das chuvas.',
  'IPCC AR6 – América do Sul', (SELECT id_destino FROM destino WHERE nome='Lençóis Maranhenses')),
 ('Mata Atlântica – Ilha Grande', 'Angra dos Reis, RJ', 'Brasil', 'Floresta costeira', -23.143900, -44.173600, 74, 0.80, 0.60,
  'Fragmentação, esgoto e lixo no litoral',
  'Bioma com pequena parte da cobertura original preservada; o litoral sofre com esgoto e lixo turístico.',
  'SOS Mata Atlântica / INPE', (SELECT id_destino FROM destino WHERE nome='Ilha Grande')),
 ('Maldivas', 'Oceano Índico', 'Maldivas', 'Atol de coral', 3.202800, 73.220700, 52, 1.70, 0.85,
  'Elevação do nível do mar e perda de corais',
  'Cerca de 80% do território fica a menos de 1 m acima do nível do mar.',
  'IPCC AR6 – Pequenos Estados Insulares', NULL),
 ('Veneza e sua laguna', 'Vêneto', 'Itália', 'Laguna costeira', 45.440800, 12.315500, 55, 1.40, 0.70,
  'Elevação do mar, inundações (acqua alta) e superturismo',
  'Inundações mais frequentes exigem o acionamento recorrente das barreiras do sistema MOSE.',
  'IPCC AR6 – Europa', NULL),
 ('Geleiras dos Alpes', 'Suíça / Áustria', 'Europa', 'Geleira', 46.500000, 8.000000, 40, 2.80, 0.95,
  'Aquecimento atmosférico',
  'As geleiras suíças perderam cerca de 10% do volume somente em 2022–2023.',
  'GLAMOS – Glacier Monitoring Switzerland', NULL),
 ('Mar Morto', 'Israel / Jordânia', 'Oriente Médio', 'Lago hipersalino', 31.559000, 35.473200, 48, 1.50, 0.50,
  'Desvio de água e evaporação acelerada',
  'O nível da água cai cerca de 1 metro por ano.',
  'Estudos hidrológicos regionais', NULL);

-- Histórico de demonstração para o João (id 3), em datas passadas.
INSERT INTO registro_acao (id_usuario, id_acao, descricao, data_registro)
SELECT u.id_usuario, a.id_acao, t.descr, t.dt
FROM (
  SELECT 'Escolhi ônibus/trem em vez de avião' AS acao, 'Brasília → Alto Paraíso de ônibus' AS descr, '2026-11-20 08:00:00' AS dt
  UNION ALL SELECT 'Contratei guia local credenciado', 'Trilha dos Saltos com guia da comunidade', '2026-11-21 09:30:00'
  UNION ALL SELECT 'Recolhi lixo em trilha/praia',    'Recolhi plástico na trilha das cachoeiras', '2026-11-21 15:00:00'
  UNION ALL SELECT 'Fiquei em hospedagem certificada','Pousada Trilha do Cerrado (Green Key)',     '2026-11-22 12:00:00'
  UNION ALL SELECT 'Comprei de produtor local',       'Café e queijo de produtores de Alto Paraíso','2026-11-23 10:00:00'
) t
JOIN usuario u ON u.email = 'joao@email.com'
JOIN acao_sustentavel a ON a.nome = t.acao
WHERE NOT EXISTS (SELECT 1 FROM registro_acao);
