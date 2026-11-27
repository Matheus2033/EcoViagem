package com.ecoviagem.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Fatores de emissão e registro das rotas sustentáveis escolhidas. */
@Repository
public class RotaRepository {

    private final JdbcClient jdbc;

    public RotaRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** nome do transporte (minúsculo) → kg CO₂ por km por pessoa. */
    public Map<String, Double> fatores() {
        Map<String, Double> out = new HashMap<>();
        jdbc.sql("SELECT nome, fator_emissao_co2_km FROM tipo_transporte").query().listOfRows()
                .forEach(r -> out.put(String.valueOf(r.get("nome")).toLowerCase(),
                        ((BigDecimal) r.get("fator_emissao_co2_km")).doubleValue()));
        return out;
    }

    public int inserir(int idUsuario, String origem, String destino, double oLat, double oLng,
                       double dLat, double dLng, String modo, double km, double co2, double evitado, int tokens) {
        var kh = new GeneratedKeyHolder();
        jdbc.sql("""
                INSERT INTO rota_sustentavel (id_usuario, origem, destino, origem_lat, origem_lng,
                       destino_lat, destino_lng, modo, distancia_km, co2_kg, co2_evitado_kg, tokens)
                VALUES (:u, :o, :d, :olat, :olng, :dlat, :dlng, :m, :km, :co2, :ev, :t)
                """)
                .param("u", idUsuario).param("o", origem).param("d", destino)
                .param("olat", oLat).param("olng", oLng).param("dlat", dLat).param("dlng", dLng)
                .param("m", modo).param("km", km).param("co2", co2).param("ev", evitado).param("t", tokens)
                .update(kh, "id_rota");
        return kh.getKey().intValue();
    }

    public List<Map<String, Object>> doUsuario(int idUsuario) {
        return jdbc.sql("""
                SELECT id_rota, origem, destino, modo, distancia_km, co2_kg, co2_evitado_kg, tokens, data_registro
                FROM rota_sustentavel WHERE id_usuario = :u ORDER BY data_registro DESC LIMIT 50
                """).param("u", idUsuario).query().listOfRows();
    }

    /** Modos já registrados hoje pelo usuário para este mesmo trajeto. */
    public List<String> modosHoje(int idUsuario, double oLat, double oLng, double dLat, double dLng) {
        return jdbc.sql("""
                SELECT DISTINCT modo FROM rota_sustentavel
                WHERE id_usuario = :u AND DATE(data_registro) = CURRENT_DATE
                  AND origem_lat = ROUND(:olat, 6) AND origem_lng = ROUND(:olng, 6)
                  AND destino_lat = ROUND(:dlat, 6) AND destino_lng = ROUND(:dlng, 6)
                """)
                .param("u", idUsuario).param("olat", oLat).param("olng", oLng)
                .param("dlat", dLat).param("dlng", dLng)
                .query(String.class).list();
    }

    public int registradasHoje(int idUsuario) {
        return jdbc.sql("""
                SELECT COUNT(*) FROM rota_sustentavel
                WHERE id_usuario = :u AND DATE(data_registro) = CURRENT_DATE
                """).param("u", idUsuario).query(Integer.class).single();
    }
}
