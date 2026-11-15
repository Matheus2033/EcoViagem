package com.ecoviagem.controller;

import com.ecoviagem.dto.LoginRequest;
import com.ecoviagem.dto.RegistroRequest;
import com.ecoviagem.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Cadastro, login em 2 etapas (2FA por e-mail) e recuperação de senha. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    /** Cadastro → dispara o 2FA (precisa confirmar o código para entrar). */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegistroRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registrar(req));
    }

    /** Passo 1 do login: valida credenciais e dispara o código 2FA. */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        Map<String, Object> resp = auth.iniciarLogin(req);
        if (resp == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("erro", "Credenciais inválidas"));
        }
        return ResponseEntity.ok(resp);
    }

    /** Passo 2 do login: confere o código 2FA e conclui a autenticação. */
    @PostMapping("/2fa")
    public ResponseEntity<?> verificar2fa(@RequestBody Map<String, String> body) {
        return auth.confirmar2fa(body.get("email"), body.get("codigo"))
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("erro", "Código inválido ou expirado")));
    }

    /** Solicita a recuperação de senha (envia código ao e-mail cadastrado). */
    @PostMapping("/forgot")
    public ResponseEntity<?> forgot(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(auth.solicitarReset(body.get("email")));
    }

    /** Redefine a senha com o código recebido. */
    @PostMapping("/reset")
    public ResponseEntity<?> reset(@RequestBody Map<String, String> body) {
        boolean ok = auth.redefinirSenha(body.get("email"), body.get("codigo"), body.get("nova_senha"));
        if (!ok) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("erro", "Código inválido/expirado ou senha muito curta (mín. 6)"));
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
