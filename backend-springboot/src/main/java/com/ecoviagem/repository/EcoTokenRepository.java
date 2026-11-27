package com.ecoviagem.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * EcoTokens: catálogo de práticas, relatos, recompensas e resgates.
 * Tokens, limite diário, saldo e estoque são validados pelas triggers
 * trg_registro_acao_ins e trg_resgate_ins (script 08).
 */
@Repository
public class EcoTokenRepository {

    private final JdbcClient jdbc;

    public EcoTokenRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> acoes() {
        return jdbc.sql("""
                SELECT id_acao, nome, descricao, categoria, icone, tokens, limite_diario, co2_evitado_kg
                FROM acao_sustentavel ORDER BY categoria, tokens DESC
                """).query().listOfRows();
    }

    /** Quantas vezes o usuário já relatou cada prática hoje (para o front mostrar o limite). */
    public List<Map<String, Object>> usosHoje(int idUsuario) {
        return jdbc.sql("""
                SELECT id_acao, COUNT(*) AS usos
                FROM registro_acao
                WHERE id_usuario = :u AND DATE(data_registro) = CURRENT_DATE
                GROUP BY id_acao
                """).param("u", idUsuario).query().listOfRows();
    }

    public Map<String, Object> saldo(int idUsuario) {
        return jdbc.sql("""
                SELECT id_usuario, tokens_ganhos, tokens_gastos, saldo, qtd_acoes, co2_evitado_kg
                FROM vw_saldo_tokens WHERE id_usuario = :u
                """).param("u", idUsuario).query().listOfRows().stream().findFirst()
                .orElse(Map.of("id_usuario", idUsuario, "tokens_ganhos", 0, "tokens_gastos", 0,
                        "saldo", 0, "qtd_acoes", 0, "co2_evitado_kg", 0));
    }

    public int inserirRegistro(int idUsuario, int idAcao, Integer idViagem, String descricao) {
        var kh = new GeneratedKeyHolder();
        jdbc.sql("""
                INSERT INTO registro_acao (id_usuario, id_acao, id_viagem, descricao)
                VALUES (:u, :a, :v, :d)
                """)
                .param("u", idUsuario).param("a", idAcao).param("v", idViagem).param("d", descricao)
                .update(kh, "id_registro");
        return kh.getKey().intValue();
    }

    public List<Map<String, Object>> registros(int idUsuario) {
        return jdbc.sql("""
                SELECT r.id_registro, r.data_registro, r.descricao, r.tokens_ganhos,
                       a.nome AS acao, a.icone, a.categoria, a.co2_evitado_kg
                FROM registro_acao r JOIN acao_sustentavel a ON a.id_acao = r.id_acao
                WHERE r.id_usuario = :u ORDER BY r.data_registro DESC LIMIT 50
                """).param("u", idUsuario).query().listOfRows();
    }

    public List<Map<String, Object>> recompensas() {
        return jdbc.sql("""
                SELECT r.id_recompensa, r.nome, r.descricao, r.tipo, r.icone, r.custo_tokens,
                       r.estoque, r.parceiro, d.nome AS destino, d.id_destino
                FROM recompensa r LEFT JOIN destino d ON d.id_destino = r.id_destino
                WHERE r.ativo = TRUE ORDER BY r.custo_tokens
                """).query().listOfRows();
    }

    /** Trava a linha do usuário para serializar resgates simultâneos do mesmo usuário. */
    public void travarUsuario(int idUsuario) {
        jdbc.sql("SELECT id_usuario FROM usuario WHERE id_usuario = :u FOR UPDATE")
                .param("u", idUsuario).query().listOfRows();
    }

    public int inserirResgate(int idUsuario, int idRecompensa, String voucher) {
        var kh = new GeneratedKeyHolder();
        jdbc.sql("""
                INSERT INTO resgate (id_usuario, id_recompensa, codigo_voucher)
                VALUES (:u, :r, :c)
                """)
                .param("u", idUsuario).param("r", idRecompensa).param("c", voucher)
                .update(kh, "id_resgate");
        return kh.getKey().intValue();
    }

    public List<Map<String, Object>> resgates(int idUsuario) {
        return jdbc.sql("""
                SELECT s.id_resgate, s.data_resgate, s.codigo_voucher, s.tokens_gastos,
                       r.nome AS recompensa, r.icone, r.tipo, r.parceiro
                FROM resgate s JOIN recompensa r ON r.id_recompensa = s.id_recompensa
                WHERE s.id_usuario = :u ORDER BY s.data_resgate DESC
                """).param("u", idUsuario).query().listOfRows();
    }

    public Map<String, Object> resgate(int idResgate) {
        return jdbc.sql("""
                SELECT s.id_resgate, s.data_resgate, s.codigo_voucher, s.tokens_gastos,
                       r.nome AS recompensa, r.icone, r.tipo, r.parceiro
                FROM resgate s JOIN recompensa r ON r.id_recompensa = s.id_recompensa
                WHERE s.id_resgate = :id
                """).param("id", idResgate).query().singleRow();
    }

    /** Top usuários por tokens ganhos (ranking da comunidade; só o primeiro nome). */
    public List<Map<String, Object>> ranking() {
        return jdbc.sql("""
                SELECT SUBSTRING_INDEX(u.nome, ' ', 1) AS nome, s.tokens_ganhos, s.qtd_acoes, s.co2_evitado_kg
                FROM vw_saldo_tokens s JOIN usuario u ON u.id_usuario = s.id_usuario
                WHERE s.tokens_ganhos > 0
                ORDER BY s.tokens_ganhos DESC LIMIT 10
                """).query().listOfRows();
    }
}
