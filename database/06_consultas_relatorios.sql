-- =============================================================================
-- EcoViagem - Script 06: CONSULTAS DE RELATÓRIO
-- Consultas que respondem às perguntas de negócio do projeto de sustentabilidade.
-- Rode uma a uma para demonstrar na apresentação.  (MySQL 8)
-- =============================================================================
USE ecoviagem;
SET NAMES utf8mb4;

-- R1) Ranking de destinos mais sustentáveis (via view de índice) ---------------
SELECT destino, categoria, indice_sustentabilidade, qtd_praticas,
       qtd_hospedagens_renovavel, qtd_certificacoes
FROM vw_indice_sustentabilidade_destino
ORDER BY indice_sustentabilidade DESC;

-- R2) Pegada de carbono de cada viagem e emissão por pessoa --------------------
SELECT id_viagem, usuario, destino, emissao_total_kg, emissao_por_pessoa_kg
FROM vw_pegada_carbono_viagem
ORDER BY emissao_total_kg DESC;

-- R3) Emissão média de CO2 por categoria de destino ----------------------------
SELECT cd.nome AS categoria,
       ROUND(AVG(p.emissao_por_pessoa_kg), 2) AS emissao_media_por_pessoa_kg,
       COUNT(*) AS qtd_viagens
FROM vw_pegada_carbono_viagem p
JOIN viagem v   ON v.id_viagem = p.id_viagem
JOIN destino d  ON d.id_destino = v.id_destino
JOIN categoria_destino cd ON cd.id_categoria = d.id_categoria
GROUP BY cd.nome
ORDER BY emissao_media_por_pessoa_kg;

-- R4) Hospedagens com certificação ambiental vigente e uso de energia renovável
SELECT hospedagem, destino, tipo, preco_diaria, certificacoes
FROM vw_hospedagens_certificadas
WHERE qtd_certificacoes_vigentes > 0
ORDER BY qtd_certificacoes_vigentes DESC, preco_diaria;

-- R5) Destinos mais bem avaliados (média de notas) -----------------------------
SELECT destino, media_nota, qtd_avaliacoes
FROM vw_avaliacoes_destino
WHERE qtd_avaliacoes > 0
ORDER BY media_nota DESC, qtd_avaliacoes DESC;

-- R6) Ocupação atual vs capacidade (controle de superlotação) ------------------
SELECT destino, capacidade_maxima_diaria, ocupacao_hoje, percentual_ocupacao_hoje
FROM vw_ocupacao_destino
ORDER BY percentual_ocupacao_hoje DESC;

-- R7) Transporte mais usado e sua emissão total (GROUP BY + agregação) ---------
SELECT tt.nome AS transporte,
       COUNT(*)                     AS qtd_trechos,
       ROUND(SUM(t.distancia_km),0) AS km_total,
       ROUND(SUM(t.emissao_co2_kg),2) AS emissao_total_kg
FROM trecho_transporte t
JOIN tipo_transporte tt ON tt.id_tipo_transporte = t.id_tipo_transporte
GROUP BY tt.nome
ORDER BY emissao_total_kg DESC;

-- R8) Práticas sustentáveis mais adotadas pelas hospedagens --------------------
SELECT ps.nome AS pratica, ps.categoria, COUNT(hp.id_hospedagem) AS qtd_hospedagens
FROM pratica_sustentavel ps
LEFT JOIN hospedagem_pratica hp ON hp.id_pratica = ps.id_pratica
GROUP BY ps.nome, ps.categoria
ORDER BY qtd_hospedagens DESC;

-- R9) Usuários e total de CO2 emitido em todas as suas viagens (subconsulta) ---
SELECT u.nome,
       COUNT(DISTINCT v.id_viagem) AS qtd_viagens,
       ROUND(COALESCE(SUM(t.emissao_co2_kg),0),2) AS emissao_total_kg
FROM usuario u
LEFT JOIN viagem v ON v.id_usuario = u.id_usuario
LEFT JOIN trecho_transporte t ON t.id_viagem = v.id_viagem
WHERE u.tipo_usuario = 'TURISTA'
GROUP BY u.nome
ORDER BY emissao_total_kg DESC;

-- R10) Destinos acima de 70% de ocupação OU com índice de sustentabilidade < 40
--      (combina duas views - visão gerencial de risco)
SELECT o.destino, o.percentual_ocupacao_hoje, i.indice_sustentabilidade
FROM vw_ocupacao_destino o
JOIN vw_indice_sustentabilidade_destino i ON i.id_destino = o.id_destino
WHERE o.percentual_ocupacao_hoje >= 70 OR i.indice_sustentabilidade < 40
ORDER BY o.percentual_ocupacao_hoje DESC;

-- R11) Uso da STORED PROCEDURE dentro de transação (exemplo) -------------------
-- CALL sp_registrar_viagem(4, 6, 8, '2027-03-01', '2027-03-05', 2,
--      '[{"tipo":2,"origem":"São Paulo","destino":"Gonçalves","km":180}]', @v_id);
-- SELECT @v_id AS viagem_registrada, fn_pegada_total_viagem(@v_id) AS co2_kg;
