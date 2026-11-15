-- =============================================================================
-- EcoViagem - Script 02: VIEWS  (MySQL 8)
-- Visões para relatórios de sustentabilidade e consumo pela API/BI
-- =============================================================================
USE ecoviagem;
SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- vw_pegada_carbono_viagem
-- Pegada total de CO2 por viagem (soma dos trechos) e por pessoa.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_pegada_carbono_viagem AS
SELECT
    v.id_viagem,
    v.id_usuario,
    u.nome                                   AS usuario,
    d.nome                                   AS destino,
    v.data_inicio,
    v.data_fim,
    v.num_pessoas,
    COALESCE(SUM(t.emissao_co2_kg), 0)       AS emissao_total_kg,
    ROUND(COALESCE(SUM(t.emissao_co2_kg), 0) / v.num_pessoas, 2) AS emissao_por_pessoa_kg
FROM viagem v
JOIN usuario u ON u.id_usuario = v.id_usuario
JOIN destino d ON d.id_destino = v.id_destino
LEFT JOIN trecho_transporte t ON t.id_viagem = v.id_viagem
GROUP BY v.id_viagem, v.id_usuario, u.nome, d.nome,
         v.data_inicio, v.data_fim, v.num_pessoas;

-- -----------------------------------------------------------------------------
-- vw_avaliacoes_destino
-- Média de notas e quantidade de avaliações por destino.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_avaliacoes_destino AS
SELECT
    d.id_destino,
    d.nome                              AS destino,
    COUNT(a.id_avaliacao)               AS qtd_avaliacoes,
    ROUND(AVG(a.nota), 2)               AS media_nota
FROM destino d
LEFT JOIN avaliacao a ON a.id_destino = d.id_destino
GROUP BY d.id_destino, d.nome;

-- -----------------------------------------------------------------------------
-- vw_hospedagens_certificadas
-- Hospedagens com a lista de certificações ambientais vigentes.
-- (FILTER do PostgreSQL vira COUNT/GROUP_CONCAT com CASE no MySQL.)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_hospedagens_certificadas AS
SELECT
    h.id_hospedagem,
    h.nome                              AS hospedagem,
    d.nome                              AS destino,
    th.nome                             AS tipo,
    h.preco_diaria,
    h.usa_energia_renovavel,
    h.pegada_carbono_diaria,
    COUNT(CASE WHEN hc.data_validade IS NULL OR hc.data_validade >= CURRENT_DATE
               THEN hc.id_certificacao END)       AS qtd_certificacoes_vigentes,
    GROUP_CONCAT(CASE WHEN hc.data_validade IS NULL OR hc.data_validade >= CURRENT_DATE
                      THEN ca.nome END SEPARATOR ', ') AS certificacoes
FROM hospedagem h
JOIN destino d           ON d.id_destino = h.id_destino
JOIN tipo_hospedagem th  ON th.id_tipo_hospedagem = h.id_tipo_hospedagem
LEFT JOIN hospedagem_certificacao hc ON hc.id_hospedagem = h.id_hospedagem
LEFT JOIN certificacao_ambiental ca  ON ca.id_certificacao = hc.id_certificacao
GROUP BY h.id_hospedagem, h.nome, d.nome, th.nome,
         h.preco_diaria, h.usa_energia_renovavel, h.pegada_carbono_diaria;

-- -----------------------------------------------------------------------------
-- vw_indice_sustentabilidade_destino
-- Índice de sustentabilidade (0-100) a partir de práticas adotadas, % de
-- hospedagens com energia renovável, nº de certificações e baixa pegada média.
-- É a visão central do "ranking de destinos sustentáveis".
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_indice_sustentabilidade_destino AS
WITH praticas AS (
    SELECT h.id_destino, COUNT(DISTINCT hp.id_pratica) AS qtd_praticas
    FROM hospedagem h
    JOIN hospedagem_pratica hp ON hp.id_hospedagem = h.id_hospedagem
    GROUP BY h.id_destino
),
hosp AS (
    SELECT
        h.id_destino,
        COUNT(*)                                                   AS qtd_hospedagens,
        COUNT(CASE WHEN h.usa_energia_renovavel THEN 1 END)        AS qtd_renovavel,
        AVG(h.pegada_carbono_diaria)                               AS pegada_media
    FROM hospedagem h GROUP BY h.id_destino
),
certs AS (
    SELECT h.id_destino, COUNT(*) AS qtd_certificacoes
    FROM hospedagem h
    JOIN hospedagem_certificacao hc ON hc.id_hospedagem = h.id_hospedagem
    GROUP BY h.id_destino
)
SELECT
    d.id_destino,
    d.nome                                     AS destino,
    cd.nome                                    AS categoria,
    COALESCE(p.qtd_praticas, 0)                AS qtd_praticas,
    COALESCE(h.qtd_hospedagens, 0)             AS qtd_hospedagens,
    COALESCE(h.qtd_renovavel, 0)               AS qtd_hospedagens_renovavel,
    COALESCE(c.qtd_certificacoes, 0)           AS qtd_certificacoes,
    ROUND(COALESCE(h.pegada_media, 0), 2)      AS pegada_media_hospedagens,
    LEAST(100, ROUND(
          COALESCE(p.qtd_praticas, 0) * 8                                      -- pontos por práticas
        + CASE WHEN COALESCE(h.qtd_hospedagens,0) > 0
               THEN (h.qtd_renovavel / h.qtd_hospedagens) * 40                 -- até 40 por energia renovável
               ELSE 0 END
        + LEAST(COALESCE(c.qtd_certificacoes, 0) * 5, 20)                      -- até 20 por certificações
        + GREATEST(0, 20 - COALESCE(h.pegada_media, 20))                       -- até 20 por baixa pegada
    , 1)) AS indice_sustentabilidade
FROM destino d
JOIN categoria_destino cd ON cd.id_categoria = d.id_categoria
LEFT JOIN praticas p ON p.id_destino = d.id_destino
LEFT JOIN hosp     h ON h.id_destino = d.id_destino
LEFT JOIN certs    c ON c.id_destino = d.id_destino;

-- -----------------------------------------------------------------------------
-- vw_ocupacao_destino
-- Ocupação por destino hoje (nº de turistas em viagens ativas) vs capacidade.
-- Apoia o controle de superlotação.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_ocupacao_destino AS
SELECT
    d.id_destino,
    d.nome                              AS destino,
    d.capacidade_maxima_diaria,
    COALESCE(SUM(CASE WHEN v.status IN ('RESERVADA','CONFIRMADA')
                       AND CURRENT_DATE BETWEEN v.data_inicio AND v.data_fim
                      THEN v.num_pessoas ELSE 0 END), 0)  AS ocupacao_hoje,
    ROUND(
        COALESCE(SUM(CASE WHEN v.status IN ('RESERVADA','CONFIRMADA')
                           AND CURRENT_DATE BETWEEN v.data_inicio AND v.data_fim
                          THEN v.num_pessoas ELSE 0 END), 0)
        / d.capacidade_maxima_diaria * 100, 1)           AS percentual_ocupacao_hoje
FROM destino d
LEFT JOIN viagem v ON v.id_destino = d.id_destino
GROUP BY d.id_destino, d.nome, d.capacidade_maxima_diaria;

-- -----------------------------------------------------------------------------
-- vw_reservas_usuario
-- Reservas de hospedagem de cada usuário, com destino, noites e valor.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_reservas_usuario AS
SELECT
    r.id_reserva,
    r.id_usuario,
    u.nome                                     AS usuario,
    h.nome                                     AS hospedagem,
    d.nome                                     AS destino,
    r.data_checkin,
    r.data_checkout,
    DATEDIFF(r.data_checkout, r.data_checkin)  AS noites,
    r.num_hospedes,
    r.valor_total,
    r.status,
    r.id_viagem
FROM reserva r
JOIN usuario u     ON u.id_usuario = r.id_usuario
JOIN hospedagem h  ON h.id_hospedagem = r.id_hospedagem
JOIN destino d     ON d.id_destino = h.id_destino;
