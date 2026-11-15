package com.ecoviagem.service;

import com.ecoviagem.dto.LoginRequest;
import com.ecoviagem.dto.RegistroRequest;
import com.ecoviagem.exception.ConflitoException;
import com.ecoviagem.repository.UsuarioRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final CodigoService codigos;
    private final MailService mail;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder,
                       CodigoService codigos, MailService mail) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.codigos = codigos;
        this.mail = mail;
    }

    /** Cadastra o usuário e dispara o 2FA (precisa confirmar o código para entrar). */
    public Map<String, Object> registrar(RegistroRequest req) {
        try {
            int id = usuarios.inserir(req, encoder.encode(req.senha()));
            Map<String, Object> resumo = usuarios.buscarResumo(id);
            return emitir2fa(req.email(), String.valueOf(resumo.get("nome")));
        } catch (DuplicateKeyException e) {
            throw new ConflitoException("E-mail ou CPF já cadastrado");
        }
    }

    /**
     * Passo 1 do login: valida e-mail+senha. Se OK, emite o 2FA e devolve os dados
     * para o passo 2. Retorna null quando as credenciais são inválidas (401).
     */
    public Map<String, Object> iniciarLogin(LoginRequest req) {
        Optional<Map<String, Object>> achado = usuarios.buscarPorEmail(req.email());
        if (achado.isEmpty()) return null;
        boolean ok = encoder.matches(req.senha(), (String) achado.get().get("senha_hash"));
        if (!ok) return null;
        return emitir2fa(req.email(), String.valueOf(achado.get().get("nome")));
    }

    /** Passo 2 do login: confere o código 2FA e devolve o usuário (sem o hash). */
    public Optional<Map<String, Object>> confirmar2fa(String email, String codigo) {
        if (!codigos.validar(email, "2FA", codigo)) return Optional.empty();
        return usuarios.buscarPorEmail(email).map(u -> {
            Map<String, Object> m = new HashMap<>(u);
            m.remove("senha_hash");
            return m;
        });
    }

    /** Solicita recuperação de senha: emite um código de redefinição por e-mail. */
    public Map<String, Object> solicitarReset(String email) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true); // resposta neutra (não revela se o e-mail existe)
        usuarios.buscarPorEmail(email).ifPresent(u -> {
            String codigo = codigos.gerar(email, "RESET");
            boolean enviado = mail.enviar(email, "Recuperação de senha — EcoViagem",
                    "Olá " + u.get("nome") + ",\n\nSeu código para redefinir a senha é: " + codigo +
                            "\nEle expira em 10 minutos.\n\nSe não foi você, ignore este e-mail.");
            resp.put("enviado_email", enviado);
            if (!enviado) resp.put("codigo_demo", codigo); // sem SMTP: modo demonstração
        });
        return resp;
    }

    /** Redefine a senha após validar o código de recuperação. */
    public boolean redefinirSenha(String email, String codigo, String novaSenha) {
        if (novaSenha == null || novaSenha.length() < 6) return false;
        if (!codigos.validar(email, "RESET", codigo)) return false;
        usuarios.atualizarSenha(email, encoder.encode(novaSenha));
        return true;
    }

    /** Gera o código 2FA, tenta enviar por e-mail e monta a resposta do passo 1. */
    private Map<String, Object> emitir2fa(String email, String nome) {
        String codigo = codigos.gerar(email, "2FA");
        boolean enviado = mail.enviar(email, "Seu código de acesso — EcoViagem",
                "Olá " + nome + ",\n\nSeu código de verificação em duas etapas é: " + codigo +
                        "\nEle expira em 10 minutos.");
        Map<String, Object> resp = new HashMap<>();
        resp.put("requer_2fa", true);
        resp.put("email", email);
        resp.put("enviado_email", enviado);
        if (!enviado) resp.put("codigo_demo", codigo); // sem SMTP: mostra o código na tela
        return resp;
    }
}
