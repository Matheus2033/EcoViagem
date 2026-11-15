package com.ecoviagem.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Repository
public class ReservaRepository {

    private final JdbcClient jdbc;

    public ReservaRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** O trigger trg_valor_reserva_ins calcula o valor_total na inserção. */
    public int inserir(int idUsuario, int idHospedagem, Integer idViagem,
                       LocalDate checkin, LocalDate checkout, int numHospedes) {
        KeyHolder chave = new GeneratedKeyHolder();
        jdbc.sql("""
                INSERT INTO reserva (id_usuario, id_hospedagem, id_viagem, data_checkin, data_checkout, num_hospedes)
                VALUES (:u, :h, :v, :ini, :fim, :n)
                """)
                .param("u", idUsuario).param("h", idHospedagem).param("v", idViagem)
                .param("ini", checkin).param("fim", checkout).param("n", numHospedes)
                .update(chave);
        return chave.getKey().intValue();
    }

    public Map<String, Object> buscarResumo(int id) {
        return jdbc.sql("SELECT id_reserva, valor_total, status FROM reserva WHERE id_reserva = :id")
                .param("id", id).query().singleRow();
    }

    public List<Map<String, Object>> listarPorUsuario(int idUsuario) {
        return jdbc.sql("""
                SELECT id_reserva, hospedagem, destino, data_checkin, data_checkout,
                       noites, num_hospedes, valor_total, status, id_viagem
                FROM vw_reservas_usuario
                WHERE id_usuario = :u
                ORDER BY data_checkin DESC
                """).param("u", idUsuario).query().listOfRows();
    }
}
