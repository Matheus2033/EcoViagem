package com.ecoviagem.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Parâmetros dos ecossistemas usados pelo modelo de previsão de colapso. */
@Repository
public class PrevisaoRepository {

    private final JdbcClient jdbc;

    public PrevisaoRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT = """
            SELECT e.id_ecossistema, e.nome, e.localizacao, e.pais, e.tipo, e.latitude, e.longitude,
                   e.saude_atual, e.taxa_degradacao, e.sensibilidade, e.ameaca_principal,
                   e.evidencia, e.fonte, e.id_destino, d.nome AS destino
            FROM ecossistema_risco e LEFT JOIN destino d ON d.id_destino = e.id_destino
            """;

    public List<Map<String, Object>> listar() {
        return jdbc.sql(SELECT + " ORDER BY e.nome").query().listOfRows();
    }

    public Optional<Map<String, Object>> buscar(int id) {
        return jdbc.sql(SELECT + " WHERE e.id_ecossistema = :id")
                .param("id", id).query().listOfRows().stream().findFirst();
    }
}
