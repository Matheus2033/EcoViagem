package com.ecoviagem.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/** Consultas de relatório/BI (consomem as views de sustentabilidade). */
@Repository
public class RelatorioRepository {

    private final JdbcClient jdbc;

    public RelatorioRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, Object> indicadores() {
        return jdbc.sql("""
                SELECT
                  (SELECT COUNT(*) FROM destino)    AS total_destinos,
                  (SELECT COUNT(*) FROM hospedagem) AS total_hospedagens,
                  (SELECT COUNT(*) FROM viagem)     AS total_viagens,
                  (SELECT COUNT(*) FROM reserva)    AS total_reservas,
                  (SELECT COALESCE(ROUND(AVG(indice_sustentabilidade),1),0)
                     FROM vw_indice_sustentabilidade_destino) AS indice_medio,
                  (SELECT COALESCE(ROUND(SUM(emissao_co2_kg),0),0)
                     FROM trecho_transporte)        AS co2_total_kg
                """).query().singleRow();
    }

    public List<Map<String, Object>> sustentabilidade() {
        return jdbc.sql("""
                SELECT destino, categoria, indice_sustentabilidade, qtd_praticas,
                       qtd_hospedagens_renovavel, qtd_certificacoes
                FROM vw_indice_sustentabilidade_destino
                ORDER BY indice_sustentabilidade DESC
                """).query().listOfRows();
    }

    public List<Map<String, Object>> pegadaPorCategoria() {
        return jdbc.sql("""
                SELECT cd.nome AS categoria,
                       ROUND(AVG(p.emissao_por_pessoa_kg),2) AS emissao_media_por_pessoa_kg,
                       COUNT(*) AS qtd_viagens
                FROM vw_pegada_carbono_viagem p
                JOIN viagem v ON v.id_viagem = p.id_viagem
                JOIN destino d ON d.id_destino = v.id_destino
                JOIN categoria_destino cd ON cd.id_categoria = d.id_categoria
                GROUP BY cd.nome ORDER BY emissao_media_por_pessoa_kg
                """).query().listOfRows();
    }

    public List<Map<String, Object>> transporte() {
        return jdbc.sql("""
                SELECT tt.nome AS transporte, COUNT(*) AS qtd_trechos,
                       ROUND(SUM(t.distancia_km),0) AS km_total,
                       ROUND(SUM(t.emissao_co2_kg),2) AS emissao_total_kg
                FROM trecho_transporte t
                JOIN tipo_transporte tt ON tt.id_tipo_transporte = t.id_tipo_transporte
                GROUP BY tt.nome ORDER BY emissao_total_kg DESC
                """).query().listOfRows();
    }

    public List<Map<String, Object>> ocupacao() {
        return jdbc.sql("""
                SELECT destino, capacidade_maxima_diaria, ocupacao_hoje, percentual_ocupacao_hoje
                FROM vw_ocupacao_destino ORDER BY percentual_ocupacao_hoje DESC
                """).query().listOfRows();
    }
}
