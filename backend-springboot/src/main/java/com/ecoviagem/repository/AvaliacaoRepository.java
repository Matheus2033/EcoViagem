package com.ecoviagem.repository;

import com.ecoviagem.dto.AvaliacaoRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.Map;

@Repository
public class AvaliacaoRepository {

    private final JdbcClient jdbc;

    public AvaliacaoRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public int inserir(AvaliacaoRequest req) {
        KeyHolder chave = new GeneratedKeyHolder();
        jdbc.sql("""
                INSERT INTO avaliacao (id_usuario, id_destino, nota, comentario)
                VALUES (:u, :d, :nota, :com)
                """)
                .param("u", req.idUsuario())
                .param("d", req.idDestino())
                .param("nota", req.nota())
                .param("com", req.comentario())
                .update(chave);
        return chave.getKey().intValue();
    }

    public Map<String, Object> buscar(int id) {
        return jdbc.sql("SELECT id_avaliacao, nota, comentario, data_avaliacao FROM avaliacao WHERE id_avaliacao = :id")
                .param("id", id).query().singleRow();
    }
}
