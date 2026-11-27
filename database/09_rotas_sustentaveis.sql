-- =============================================================================
-- EcoViagem - Script 09: ROTAS SUSTENTÁVEIS que geram EcoTokens  (MySQL 8)
-- O usuário compara várias opções de trajeto no "Planejar Rota" e escolhe uma.
-- A API recalcula distância, CO₂ evitado e tokens (o cliente não define tokens);
-- a trigger limita a 3 rotas premiadas por dia e o saldo passa a somar as rotas.
-- =============================================================================
USE ecoviagem;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS rota_sustentavel (
    id_rota         INT           NOT NULL AUTO_INCREMENT,
    id_usuario      INT           NOT NULL,
    origem          VARCHAR(255)  NOT NULL,
    destino         VARCHAR(255)  NOT NULL,
    origem_lat      DECIMAL(9,6)  NOT NULL,
    origem_lng      DECIMAL(9,6)  NOT NULL,
    destino_lat     DECIMAL(9,6)  NOT NULL,
    destino_lng     DECIMAL(9,6)  NOT NULL,
    modo            VARCHAR(12)   NOT NULL,
    distancia_km    DECIMAL(8,1)  NOT NULL,
    co2_kg          DECIMAL(9,2)  NOT NULL COMMENT 'emissão da opção escolhida (por pessoa)',
    co2_evitado_kg  DECIMAL(9,2)  NOT NULL COMMENT 'vs. carro sozinho (ou avião, sem rota terrestre)',
    tokens          INT           NOT NULL,
    data_registro   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_rota),
    CONSTRAINT fk_rota_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT ck_rota_modo CHECK (modo IN ('A_PE','BICICLETA','ONIBUS','TREM','VAN','CARONA','CARRO','AVIAO')),
    CONSTRAINT ck_rota_km CHECK (distancia_km > 0),
    CONSTRAINT ck_rota_tokens CHECK (tokens > 0),
    INDEX idx_rota_usuario_data (id_usuario, data_registro)
) ENGINE=InnoDB;

DROP TRIGGER IF EXISTS trg_rota_sustentavel_ins;
DELIMITER $$
CREATE TRIGGER trg_rota_sustentavel_ins
BEFORE INSERT ON rota_sustentavel FOR EACH ROW
BEGIN
    DECLARE v_hoje INT;
    SELECT COUNT(*) INTO v_hoje FROM rota_sustentavel
    WHERE id_usuario = NEW.id_usuario AND DATE(data_registro) = CURRENT_DATE;
    IF v_hoje >= 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Você já registrou 3 rotas sustentáveis hoje. Volte amanhã!';
    END IF;
    IF EXISTS (SELECT 1 FROM rota_sustentavel
               WHERE id_usuario = NEW.id_usuario AND modo = NEW.modo
                 AND origem_lat = NEW.origem_lat AND origem_lng = NEW.origem_lng
                 AND destino_lat = NEW.destino_lat AND destino_lng = NEW.destino_lng
                 AND DATE(data_registro) = CURRENT_DATE) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Esta rota já foi registrada hoje.';
    END IF;
END$$
DELIMITER ;

-- Saldo passa a somar práticas relatadas + rotas sustentáveis.
CREATE OR REPLACE VIEW vw_saldo_tokens AS
SELECT u.id_usuario,
       COALESCE(g.ganhos, 0) + COALESCE(rt.ganhos, 0)                         AS tokens_ganhos,
       COALESCE(s.gastos, 0)                                                  AS tokens_gastos,
       COALESCE(g.ganhos, 0) + COALESCE(rt.ganhos, 0) - COALESCE(s.gastos, 0) AS saldo,
       COALESCE(g.qtd, 0) + COALESCE(rt.qtd, 0)                               AS qtd_acoes,
       COALESCE(g.co2, 0) + COALESCE(rt.co2, 0)                               AS co2_evitado_kg
FROM usuario u
LEFT JOIN (SELECT r.id_usuario, SUM(r.tokens_ganhos) AS ganhos, COUNT(*) AS qtd,
                  SUM(a.co2_evitado_kg) AS co2
           FROM registro_acao r JOIN acao_sustentavel a ON a.id_acao = r.id_acao
           GROUP BY r.id_usuario) g ON g.id_usuario = u.id_usuario
LEFT JOIN (SELECT id_usuario, SUM(tokens) AS ganhos, COUNT(*) AS qtd, SUM(co2_evitado_kg) AS co2
           FROM rota_sustentavel GROUP BY id_usuario) rt ON rt.id_usuario = u.id_usuario
LEFT JOIN (SELECT id_usuario, SUM(tokens_gastos) AS gastos
           FROM resgate GROUP BY id_usuario) s ON s.id_usuario = u.id_usuario;

GRANT SELECT, INSERT ON ecoviagem.rota_sustentavel TO perfil_turista;
GRANT SELECT         ON ecoviagem.rota_sustentavel TO perfil_bi;
GRANT SELECT         ON ecoviagem.rota_sustentavel TO perfil_gestor;
