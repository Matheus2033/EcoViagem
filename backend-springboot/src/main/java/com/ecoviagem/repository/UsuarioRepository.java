package com.ecoviagem.repository;

import com.ecoviagem.dto.RegistroRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;

@Repository
public class UsuarioRepository {

    private final JdbcClient jdbc;

    public UsuarioRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Insere o usuário e devolve o id gerado (MySQL não tem RETURNING). */
    public int inserir(RegistroRequest req, String senhaHash) {
        KeyHolder chave = new GeneratedKeyHolder();
        jdbc.sql("""
                INSERT INTO usuario (nome, email, senha_hash, cpf, data_nascimento)
                VALUES (:nome, :email, :hash, :cpf, :nasc)
                """)
                .param("nome", req.nome())
                .param("email", req.email())
                .param("hash", senhaHash)
                .param("cpf", req.cpf())
                .param("nasc", req.dataNascimento())
                .update(chave);
        return chave.getKey().intValue();
    }

    public Map<String, Object> buscarResumo(int id) {
        return jdbc.sql("SELECT id_usuario, nome, email, tipo_usuario FROM usuario WHERE id_usuario = :id")
                .param("id", id)
                .query().singleRow();
    }

    /** Atualiza o hash de senha de um usuário (recuperação de senha). */
    public void atualizarSenha(String email, String senhaHash) {
        jdbc.sql("UPDATE usuario SET senha_hash = :hash WHERE email = :email")
                .param("hash", senhaHash)
                .param("email", email)
                .update();
    }

    /** Busca por e-mail (inclui o hash da senha, usado só na autenticação). */
    public Optional<Map<String, Object>> buscarPorEmail(String email) {
        return jdbc.sql("""
                SELECT id_usuario, nome, email, senha_hash, tipo_usuario
                FROM usuario WHERE email = :email AND ativo = TRUE
                """)
                .param("email", email)
                .query().listOfRows().stream().findFirst();
    }
}
