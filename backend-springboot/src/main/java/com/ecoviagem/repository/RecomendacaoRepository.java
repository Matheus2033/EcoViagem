package com.ecoviagem.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * Recomendação de destinos com pontuação calculada no banco:
 *   55% índice de sustentabilidade + 25% folga de capacidade (evita superlotação)
 * + 20% nota dos viajantes + 8 pts de afinidade (categoria que o usuário já curtiu)
 * − 10 pts se ele já viajou para lá (incentiva conhecer lugares novos).
 */
@Repository
public class RecomendacaoRepository {

    private final JdbcClient jdbc;

    public RecomendacaoRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> destinos(Integer idUsuario, int limite) {
        return jdbc.sql("""
                SELECT d.id_destino, d.nome, d.cidade, d.estado, d.descricao, d.latitude, d.longitude,
                       cd.nome AS categoria,
                       COALESCE(i.indice_sustentabilidade, 0)  AS indice_sustentabilidade,
                       COALESCE(oc.percentual_ocupacao_hoje, 0) AS percentual_ocupacao_hoje,
                       av.media_nota, COALESCE(av.qtd_avaliacoes, 0) AS qtd_avaliacoes,
                       h.preco_min_eco, h.qtd_hosp_renovavel,
                       a.qtd_atividades_baixo_impacto,
                       (cd.id_categoria IN (SELECT d2.id_categoria FROM viagem v2
                                            JOIN destino d2 ON d2.id_destino = v2.id_destino
                                            WHERE v2.id_usuario = :u)) AS afinidade,
                       (d.id_destino IN (SELECT v3.id_destino FROM viagem v3 WHERE v3.id_usuario = :u)) AS ja_visitado,
                       ROUND(
                         0.55 * COALESCE(i.indice_sustentabilidade, 0)
                       + 0.25 * (100 - LEAST(COALESCE(oc.percentual_ocupacao_hoje, 0), 100))
                       + 0.20 * COALESCE(av.media_nota / 5 * 100, 60)
                       + IF(cd.id_categoria IN (SELECT d2.id_categoria FROM viagem v2
                                                JOIN destino d2 ON d2.id_destino = v2.id_destino
                                                WHERE v2.id_usuario = :u), 8, 0)
                       - IF(d.id_destino IN (SELECT v3.id_destino FROM viagem v3 WHERE v3.id_usuario = :u), 10, 0)
                       , 1) AS pontuacao
                FROM destino d
                JOIN categoria_destino cd ON cd.id_categoria = d.id_categoria
                LEFT JOIN vw_indice_sustentabilidade_destino i ON i.id_destino = d.id_destino
                LEFT JOIN vw_avaliacoes_destino av ON av.id_destino = d.id_destino
                LEFT JOIN vw_ocupacao_destino oc ON oc.id_destino = d.id_destino
                LEFT JOIN (SELECT id_destino,
                                  MIN(CASE WHEN usa_energia_renovavel THEN preco_diaria END) AS preco_min_eco,
                                  SUM(usa_energia_renovavel) AS qtd_hosp_renovavel
                           FROM hospedagem GROUP BY id_destino) h ON h.id_destino = d.id_destino
                LEFT JOIN (SELECT id_destino, COUNT(*) AS qtd_atividades_baixo_impacto
                           FROM atividade WHERE impacto_ambiental = 'BAIXO'
                           GROUP BY id_destino) a ON a.id_destino = d.id_destino
                ORDER BY pontuacao DESC
                LIMIT :lim
                """)
                .param("u", idUsuario == null ? -1 : idUsuario)
                .param("lim", limite)
                .query().listOfRows();
    }

    /** Resumo do impacto do usuário (para personalizar as dicas). */
    public Map<String, Object> perfil(int idUsuario) {
        return jdbc.sql("""
                SELECT COUNT(DISTINCT v.id_viagem) AS qtd_viagens,
                       COALESCE(ROUND(SUM(t.emissao_co2_kg), 1), 0) AS co2_total_kg,
                       COALESCE(ROUND(SUM(CASE WHEN tt.nome = 'Avião' THEN t.emissao_co2_kg END), 1), 0) AS co2_aviao_kg,
                       COALESCE(ROUND(SUM(t.distancia_km), 0), 0) AS km_total
                FROM viagem v
                LEFT JOIN trecho_transporte t ON t.id_viagem = v.id_viagem
                LEFT JOIN tipo_transporte tt ON tt.id_tipo_transporte = t.id_tipo_transporte
                WHERE v.id_usuario = :u
                """).param("u", idUsuario).query().singleRow();
    }
}
