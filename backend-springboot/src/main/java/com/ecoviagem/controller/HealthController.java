package com.ecoviagem.controller;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final JdbcClient jdbc;

    public HealthController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Confirma a conexão com o banco e sob qual usuário a API está conectada. */
    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> row = jdbc.sql("SELECT NOW() AS agora, CURRENT_USER() AS usuario_bd")
                .query().singleRow();
        return Map.of("status", "ok", "banco", "conectado",
                "agora", row.get("agora"), "usuario_bd", row.get("usuario_bd"));
    }
}
