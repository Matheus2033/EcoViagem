package com.ecoviagem.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class DestinoRepository {

    private final JdbcClient jdbc;

    public DestinoRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Lista destinos com índice de sustentabilidade e avaliação, com filtros opcionais. */
    public List<Map<String, Object>> listar(String categoria, String estado, String busca) {
        StringBuilder sql = new StringBuilder("""
                SELECT d.id_destino, d.nome, d.cidade, d.estado, d.descricao,
                       d.latitude, d.longitude,
                       cd.nome AS categoria,
                       i.indice_sustentabilidade,
                       av.media_nota, av.qtd_avaliacoes,
                       oc.percentual_ocupacao_hoje
                FROM destino d
                JOIN categoria_destino cd ON cd.id_categoria = d.id_categoria
                LEFT JOIN vw_indice_sustentabilidade_destino i ON i.id_destino = d.id_destino
                LEFT JOIN vw_avaliacoes_destino av ON av.id_destino = d.id_destino
                LEFT JOIN vw_ocupacao_destino oc ON oc.id_destino = d.id_destino
                """);
        List<String> filtros = new ArrayList<>();
        if (categoria != null) filtros.add("cd.nome = :categoria");
        if (estado != null)    filtros.add("d.estado = :estado");
        // A collation utf8mb4_0900_ai_ci faz o LIKE ignorar maiúsculas e acentos.
        if (busca != null)     filtros.add("d.nome LIKE :busca");
        if (!filtros.isEmpty()) sql.append("WHERE ").append(String.join(" AND ", filtros)).append(' ');
        sql.append("ORDER BY i.indice_sustentabilidade DESC");

        var spec = jdbc.sql(sql.toString());
        if (categoria != null) spec = spec.param("categoria", categoria);
        if (estado != null)    spec = spec.param("estado", estado);
        if (busca != null)     spec = spec.param("busca", "%" + busca + "%");
        return spec.query().listOfRows();
    }

    public Optional<Map<String, Object>> buscar(int id) {
        return jdbc.sql("""
                SELECT d.*, cd.nome AS categoria, i.indice_sustentabilidade,
                       av.media_nota, av.qtd_avaliacoes
                FROM destino d
                JOIN categoria_destino cd ON cd.id_categoria = d.id_categoria
                LEFT JOIN vw_indice_sustentabilidade_destino i ON i.id_destino = d.id_destino
                LEFT JOIN vw_avaliacoes_destino av ON av.id_destino = d.id_destino
                WHERE d.id_destino = :id
                """).param("id", id).query().listOfRows().stream().findFirst();
    }

    public List<Map<String, Object>> hospedagens(int idDestino) {
        return jdbc.sql("""
                SELECT * FROM vw_hospedagens_certificadas
                WHERE destino = (SELECT nome FROM destino WHERE id_destino = :id)
                ORDER BY preco_diaria
                """).param("id", idDestino).query().listOfRows();
    }

    public List<Map<String, Object>> atividades(int idDestino) {
        return jdbc.sql("""
                SELECT a.id_atividade, a.nome, a.descricao, a.impacto_ambiental, a.preco,
                       ca.nome AS categoria
                FROM atividade a
                JOIN categoria_atividade ca ON ca.id_categoria_atividade = a.id_categoria_atividade
                WHERE a.id_destino = :id
                """).param("id", idDestino).query().listOfRows();
    }

    /** Práticas sustentáveis do destino, agregadas a partir das hospedagens. */
    public List<Map<String, Object>> praticas(int idDestino) {
        return jdbc.sql("""
                SELECT DISTINCT ps.nome, ps.categoria
                FROM hospedagem h
                JOIN hospedagem_pratica hp ON hp.id_hospedagem = h.id_hospedagem
                JOIN pratica_sustentavel ps ON ps.id_pratica = hp.id_pratica
                WHERE h.id_destino = :id
                ORDER BY ps.categoria
                """).param("id", idDestino).query().listOfRows();
    }

    public List<Map<String, Object>> avaliacoes(int idDestino) {
        return jdbc.sql("""
                SELECT a.nota, a.comentario, a.data_avaliacao, u.nome AS usuario
                FROM avaliacao a JOIN usuario u ON u.id_usuario = a.id_usuario
                WHERE a.id_destino = :id ORDER BY a.data_avaliacao DESC
                """).param("id", idDestino).query().listOfRows();
    }
}
