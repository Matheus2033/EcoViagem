package com.ecoviagem.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/** Dados auxiliares para preencher formulários do frontend. */
@Repository
public class MetaRepository {

    private final JdbcClient jdbc;

    public MetaRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> tiposTransporte() {
        return jdbc.sql("""
                SELECT id_tipo_transporte, nome, fator_emissao_co2_km
                FROM tipo_transporte ORDER BY nome
                """).query().listOfRows();
    }

    public List<Map<String, Object>> categoriasDestino() {
        return jdbc.sql("SELECT id_categoria, nome FROM categoria_destino ORDER BY nome")
                .query().listOfRows();
    }
}
