package com.ecoviagem.repository;

import com.ecoviagem.dto.TrechoRequest;
import com.ecoviagem.dto.ViagemRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ViagemRepository {

    private final JdbcClient jdbc;

    public ViagemRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public int inserir(ViagemRequest req) {
        KeyHolder chave = new GeneratedKeyHolder();
        jdbc.sql("""
                INSERT INTO viagem (id_usuario, id_destino, data_inicio, data_fim, num_pessoas)
                VALUES (:u, :d, :ini, :fim, :n)
                """)
                .param("u", req.idUsuario()).param("d", req.idDestino())
                .param("ini", req.dataInicio()).param("fim", req.dataFim())
                .param("n", req.pessoasOuUm())
                .update(chave);
        return chave.getKey().intValue();
    }

    /** O trigger trg_emissao_trecho_ins calcula a emissão de CO2 na inserção. */
    public void inserirTrecho(int idViagem, TrechoRequest t) {
        jdbc.sql("""
                INSERT INTO trecho_transporte (id_viagem, id_tipo_transporte, origem, destino_trecho, distancia_km)
                VALUES (:v, :tt, :o, :dt, :km)
                """)
                .param("v", idViagem)
                .param("tt", t.idTipoTransporte())
                .param("o", t.origem())
                .param("dt", t.destino())
                .param("km", t.km())
                .update();
    }

    public List<Map<String, Object>> listarPorUsuario(int idUsuario) {
        return jdbc.sql("""
                SELECT v.id_viagem, v.data_inicio, v.data_fim, v.num_pessoas, v.status,
                       d.nome AS destino, d.estado,
                       r.hospedagem AS hospedagem, r.valor_total,
                       p.emissao_total_kg, p.emissao_por_pessoa_kg
                FROM viagem v
                JOIN destino d ON d.id_destino = v.id_destino
                LEFT JOIN vw_reservas_usuario r ON r.id_viagem = v.id_viagem
                LEFT JOIN vw_pegada_carbono_viagem p ON p.id_viagem = v.id_viagem
                WHERE v.id_usuario = :u
                ORDER BY v.data_inicio DESC
                """).param("u", idUsuario).query().listOfRows();
    }

    public Optional<Map<String, Object>> buscar(int id) {
        return jdbc.sql("""
                SELECT v.*, d.nome AS destino
                FROM viagem v JOIN destino d ON d.id_destino = v.id_destino
                WHERE v.id_viagem = :id
                """).param("id", id).query().listOfRows().stream().findFirst();
    }

    public List<Map<String, Object>> trechos(int idViagem) {
        return jdbc.sql("""
                SELECT t.origem, t.destino_trecho, t.distancia_km, t.emissao_co2_kg, tt.nome AS transporte
                FROM trecho_transporte t
                JOIN tipo_transporte tt ON tt.id_tipo_transporte = t.id_tipo_transporte
                WHERE t.id_viagem = :id ORDER BY t.id_trecho
                """).param("id", idViagem).query().listOfRows();
    }

    public int atualizarStatus(int id, String status) {
        return jdbc.sql("UPDATE viagem SET status = :s WHERE id_viagem = :id")
                .param("s", status).param("id", id).update();
    }

    public BigDecimal pegadaTotal(int idViagem) {
        return jdbc.sql("SELECT fn_pegada_total_viagem(:v)")
                .param("v", idViagem).query(BigDecimal.class).single();
    }
}
