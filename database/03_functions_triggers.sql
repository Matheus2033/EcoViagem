-- =============================================================================
-- EcoViagem - Script 03: FUNÇÕES, TRIGGERS e STORED PROCEDURE  (MySQL 8)
-- Lógica no servidor: cálculo automático, validações de integridade de
-- negócio, auditoria e transações.
-- =============================================================================
USE ecoviagem;
SET NAMES utf8mb4;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- TRIGGERS: cálculo automático da emissão de CO2 de um trecho
-- emissao = distancia_km * num_pessoas_da_viagem * fator_emissao_do_modal
-- (No MySQL cada evento precisa de seu próprio trigger: INSERT e UPDATE.)
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_emissao_trecho_ins
BEFORE INSERT ON trecho_transporte
FOR EACH ROW
BEGIN
    DECLARE v_fator   DECIMAL(8,4);
    DECLARE v_pessoas INT;
    SELECT fator_emissao_co2_km INTO v_fator
        FROM tipo_transporte WHERE id_tipo_transporte = NEW.id_tipo_transporte;
    SELECT num_pessoas INTO v_pessoas
        FROM viagem WHERE id_viagem = NEW.id_viagem;
    SET NEW.emissao_co2_kg = ROUND(NEW.distancia_km * COALESCE(v_pessoas,1) * COALESCE(v_fator,0), 2);
END$$

CREATE TRIGGER trg_emissao_trecho_upd
BEFORE UPDATE ON trecho_transporte
FOR EACH ROW
BEGIN
    DECLARE v_fator   DECIMAL(8,4);
    DECLARE v_pessoas INT;
    SELECT fator_emissao_co2_km INTO v_fator
        FROM tipo_transporte WHERE id_tipo_transporte = NEW.id_tipo_transporte;
    SELECT num_pessoas INTO v_pessoas
        FROM viagem WHERE id_viagem = NEW.id_viagem;
    SET NEW.emissao_co2_kg = ROUND(NEW.distancia_km * COALESCE(v_pessoas,1) * COALESCE(v_fator,0), 2);
END$$

-- -----------------------------------------------------------------------------
-- TRIGGERS: cálculo automático do valor total da reserva
-- valor_total = preço da diária da hospedagem * número de noites
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_valor_reserva_ins
BEFORE INSERT ON reserva
FOR EACH ROW
BEGIN
    DECLARE v_preco  DECIMAL(10,2);
    DECLARE v_noites INT;
    SELECT preco_diaria INTO v_preco FROM hospedagem WHERE id_hospedagem = NEW.id_hospedagem;
    SET v_noites = GREATEST(1, DATEDIFF(NEW.data_checkout, NEW.data_checkin));
    SET NEW.valor_total = ROUND(COALESCE(v_preco,0) * v_noites, 2);
END$$

CREATE TRIGGER trg_valor_reserva_upd
BEFORE UPDATE ON reserva
FOR EACH ROW
BEGIN
    DECLARE v_preco  DECIMAL(10,2);
    DECLARE v_noites INT;
    SELECT preco_diaria INTO v_preco FROM hospedagem WHERE id_hospedagem = NEW.id_hospedagem;
    SET v_noites = GREATEST(1, DATEDIFF(NEW.data_checkout, NEW.data_checkin));
    SET NEW.valor_total = ROUND(COALESCE(v_preco,0) * v_noites, 2);
END$$

-- -----------------------------------------------------------------------------
-- TRIGGERS: controle de superlotação do destino
-- Impede reservar/confirmar viagem que ultrapasse a capacidade diária do destino
-- em qualquer dia do período. Em caso de estouro, SIGNAL aborta a operação.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_valida_capacidade_ins
BEFORE INSERT ON viagem
FOR EACH ROW
BEGIN
    DECLARE v_capacidade INT;
    DECLARE v_dia        DATE;
    DECLARE v_ocupacao   INT;
    IF NEW.status <> 'CANCELADA' THEN
        SELECT capacidade_maxima_diaria INTO v_capacidade FROM destino WHERE id_destino = NEW.id_destino;
        SET v_dia = NEW.data_inicio;
        WHILE v_dia <= NEW.data_fim DO
            SELECT COALESCE(SUM(num_pessoas),0) INTO v_ocupacao
            FROM viagem
            WHERE id_destino = NEW.id_destino
              AND status IN ('RESERVADA','CONFIRMADA')
              AND v_dia BETWEEN data_inicio AND data_fim;
            IF (v_ocupacao + NEW.num_pessoas) > v_capacidade THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Capacidade do destino excedida para o periodo solicitado';
            END IF;
            SET v_dia = DATE_ADD(v_dia, INTERVAL 1 DAY);
        END WHILE;
    END IF;
END$$

CREATE TRIGGER trg_valida_capacidade_upd
BEFORE UPDATE ON viagem
FOR EACH ROW
BEGIN
    DECLARE v_capacidade INT;
    DECLARE v_dia        DATE;
    DECLARE v_ocupacao   INT;
    IF NEW.status <> 'CANCELADA' THEN
        SELECT capacidade_maxima_diaria INTO v_capacidade FROM destino WHERE id_destino = NEW.id_destino;
        SET v_dia = NEW.data_inicio;
        WHILE v_dia <= NEW.data_fim DO
            SELECT COALESCE(SUM(num_pessoas),0) INTO v_ocupacao
            FROM viagem
            WHERE id_destino = NEW.id_destino
              AND status IN ('RESERVADA','CONFIRMADA')
              AND id_viagem <> NEW.id_viagem
              AND v_dia BETWEEN data_inicio AND data_fim;
            IF (v_ocupacao + NEW.num_pessoas) > v_capacidade THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Capacidade do destino excedida para o periodo solicitado';
            END IF;
            SET v_dia = DATE_ADD(v_dia, INTERVAL 1 DAY);
        END WHILE;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- TRIGGERS DE AUDITORIA (INSERT/UPDATE/DELETE) nas tabelas sensíveis.
-- Gravam em log_auditoria os dados antigos/novos em JSON. No MySQL o trigger
-- executa com os privilégios do DEFINER (admin), então a API (usuário de menor
-- privilégio) aciona a auditoria sem precisar de INSERT direto em log_auditoria.
-- -----------------------------------------------------------------------------

-- USUARIO (senha_hash é omitida do log por segurança)
CREATE TRIGGER trg_audit_usuario_ins AFTER INSERT ON usuario FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_novos)
VALUES ('usuario','INSERT', NEW.id_usuario, SESSION_USER(),
        JSON_OBJECT('id_usuario',NEW.id_usuario,'nome',NEW.nome,'email',NEW.email,
                    'cpf',NEW.cpf,'tipo_usuario',NEW.tipo_usuario,'ativo',NEW.ativo))$$
CREATE TRIGGER trg_audit_usuario_upd AFTER UPDATE ON usuario FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_antigos, dados_novos)
VALUES ('usuario','UPDATE', NEW.id_usuario, SESSION_USER(),
        JSON_OBJECT('id_usuario',OLD.id_usuario,'nome',OLD.nome,'email',OLD.email,'tipo_usuario',OLD.tipo_usuario,'ativo',OLD.ativo),
        JSON_OBJECT('id_usuario',NEW.id_usuario,'nome',NEW.nome,'email',NEW.email,'tipo_usuario',NEW.tipo_usuario,'ativo',NEW.ativo))$$
CREATE TRIGGER trg_audit_usuario_del AFTER DELETE ON usuario FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_antigos)
VALUES ('usuario','DELETE', OLD.id_usuario, SESSION_USER(),
        JSON_OBJECT('id_usuario',OLD.id_usuario,'nome',OLD.nome,'email',OLD.email,'tipo_usuario',OLD.tipo_usuario,'ativo',OLD.ativo))$$

-- VIAGEM
CREATE TRIGGER trg_audit_viagem_ins AFTER INSERT ON viagem FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_novos)
VALUES ('viagem','INSERT', NEW.id_viagem, SESSION_USER(),
        JSON_OBJECT('id_viagem',NEW.id_viagem,'id_usuario',NEW.id_usuario,'id_destino',NEW.id_destino,
                    'data_inicio',NEW.data_inicio,'data_fim',NEW.data_fim,'num_pessoas',NEW.num_pessoas,'status',NEW.status))$$
CREATE TRIGGER trg_audit_viagem_upd AFTER UPDATE ON viagem FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_antigos, dados_novos)
VALUES ('viagem','UPDATE', NEW.id_viagem, SESSION_USER(),
        JSON_OBJECT('id_viagem',OLD.id_viagem,'status',OLD.status,'num_pessoas',OLD.num_pessoas,'data_inicio',OLD.data_inicio,'data_fim',OLD.data_fim),
        JSON_OBJECT('id_viagem',NEW.id_viagem,'status',NEW.status,'num_pessoas',NEW.num_pessoas,'data_inicio',NEW.data_inicio,'data_fim',NEW.data_fim))$$
CREATE TRIGGER trg_audit_viagem_del AFTER DELETE ON viagem FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_antigos)
VALUES ('viagem','DELETE', OLD.id_viagem, SESSION_USER(),
        JSON_OBJECT('id_viagem',OLD.id_viagem,'id_usuario',OLD.id_usuario,'id_destino',OLD.id_destino,'status',OLD.status))$$

-- HOSPEDAGEM
CREATE TRIGGER trg_audit_hospedagem_ins AFTER INSERT ON hospedagem FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_novos)
VALUES ('hospedagem','INSERT', NEW.id_hospedagem, SESSION_USER(),
        JSON_OBJECT('id_hospedagem',NEW.id_hospedagem,'id_destino',NEW.id_destino,'nome',NEW.nome,
                    'preco_diaria',NEW.preco_diaria,'usa_energia_renovavel',NEW.usa_energia_renovavel))$$
CREATE TRIGGER trg_audit_hospedagem_upd AFTER UPDATE ON hospedagem FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_antigos, dados_novos)
VALUES ('hospedagem','UPDATE', NEW.id_hospedagem, SESSION_USER(),
        JSON_OBJECT('id_hospedagem',OLD.id_hospedagem,'nome',OLD.nome,'preco_diaria',OLD.preco_diaria),
        JSON_OBJECT('id_hospedagem',NEW.id_hospedagem,'nome',NEW.nome,'preco_diaria',NEW.preco_diaria))$$
CREATE TRIGGER trg_audit_hospedagem_del AFTER DELETE ON hospedagem FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_antigos)
VALUES ('hospedagem','DELETE', OLD.id_hospedagem, SESSION_USER(),
        JSON_OBJECT('id_hospedagem',OLD.id_hospedagem,'nome',OLD.nome))$$

-- RESERVA
CREATE TRIGGER trg_audit_reserva_ins AFTER INSERT ON reserva FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_novos)
VALUES ('reserva','INSERT', NEW.id_reserva, SESSION_USER(),
        JSON_OBJECT('id_reserva',NEW.id_reserva,'id_usuario',NEW.id_usuario,'id_hospedagem',NEW.id_hospedagem,
                    'id_viagem',NEW.id_viagem,'valor_total',NEW.valor_total,'status',NEW.status))$$
CREATE TRIGGER trg_audit_reserva_upd AFTER UPDATE ON reserva FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_antigos, dados_novos)
VALUES ('reserva','UPDATE', NEW.id_reserva, SESSION_USER(),
        JSON_OBJECT('id_reserva',OLD.id_reserva,'valor_total',OLD.valor_total,'status',OLD.status),
        JSON_OBJECT('id_reserva',NEW.id_reserva,'valor_total',NEW.valor_total,'status',NEW.status))$$
CREATE TRIGGER trg_audit_reserva_del AFTER DELETE ON reserva FOR EACH ROW
INSERT INTO log_auditoria(tabela, operacao, registro_id, usuario_bd, dados_antigos)
VALUES ('reserva','DELETE', OLD.id_reserva, SESSION_USER(),
        JSON_OBJECT('id_reserva',OLD.id_reserva,'id_hospedagem',OLD.id_hospedagem,'status',OLD.status))$$

-- -----------------------------------------------------------------------------
-- FUNÇÃO: pegada total de carbono de uma viagem (soma dos trechos)
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_pegada_total_viagem(p_id_viagem INT)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(12,2);
    SELECT COALESCE(SUM(emissao_co2_kg), 0) INTO v_total
    FROM trecho_transporte WHERE id_viagem = p_id_viagem;
    RETURN v_total;
END$$

-- -----------------------------------------------------------------------------
-- STORED PROCEDURE: registrar uma viagem completa dentro de uma TRANSAÇÃO
-- Insere a viagem, seus trechos e (opcional) a reserva atomicamente. Se qualquer
-- passo falhar (ex.: estouro de capacidade pela trigger), tudo é desfeito (ROLLBACK).
-- Uso: CALL sp_registrar_viagem(3, 1, 1, '2027-12-01','2027-12-05', 2,
--        '[{"tipo":1,"origem":"São Paulo","destino":"Bonito","km":900}]', @id);
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_registrar_viagem(
    IN  p_id_usuario    INT,
    IN  p_id_destino    INT,
    IN  p_id_hospedagem INT,                 -- se informado, cria também uma RESERVA
    IN  p_data_inicio   DATE,
    IN  p_data_fim      DATE,
    IN  p_num_pessoas   INT,
    IN  p_trechos       JSON,                -- array de trechos de transporte
    OUT p_id_viagem     INT
)
BEGIN
    -- Em caso de erro (ex.: SIGNAL da trigger de capacidade), desfaz tudo.
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO viagem(id_usuario, id_destino, data_inicio, data_fim, num_pessoas, status)
    VALUES (p_id_usuario, p_id_destino, p_data_inicio, p_data_fim, p_num_pessoas, 'RESERVADA');
    SET p_id_viagem = LAST_INSERT_ID();

    -- Trechos de transporte (a trigger calcula a emissão de CO2)
    IF p_trechos IS NOT NULL THEN
        INSERT INTO trecho_transporte(id_viagem, id_tipo_transporte, origem, destino_trecho, distancia_km)
        SELECT p_id_viagem, jt.tipo, jt.origem, jt.destino, jt.km
        FROM JSON_TABLE(p_trechos, '$[*]' COLUMNS(
                tipo    INT           PATH '$.tipo',
                origem  VARCHAR(120)  PATH '$.origem',
                destino VARCHAR(120)  PATH '$.destino',
                km      DECIMAL(10,2) PATH '$.km')) AS jt;
    END IF;

    -- Reserva de hospedagem vinculada à viagem (a trigger calcula o valor)
    IF p_id_hospedagem IS NOT NULL THEN
        INSERT INTO reserva(id_usuario, id_hospedagem, id_viagem,
                            data_checkin, data_checkout, num_hospedes, status)
        VALUES (p_id_usuario, p_id_hospedagem, p_id_viagem,
                p_data_inicio, p_data_fim, p_num_pessoas, 'RESERVADA');
    END IF;

    COMMIT;
END$$

DELIMITER ;
