package com.ecoviagem.controller;

import com.ecoviagem.dto.RotaRequest;
import com.ecoviagem.service.RotaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Opções de trajeto sustentáveis e registro da rota escolhida (gera EcoTokens).
 *   POST /api/rotas/opcoes     → compara opções (CO₂, tempo, custo, tokens)
 *   POST /api/rotas/registrar  → registra a opção escolhida e credita os tokens
 *   GET  /api/rotas?usuario=   → rotas sustentáveis já registradas
 */
@RestController
@RequestMapping("/api/rotas")
public class RotaController {

    private final RotaService rotas;

    public RotaController(RotaService rotas) {
        this.rotas = rotas;
    }

    @PostMapping("/opcoes")
    public Map<String, Object> opcoes(@Valid @RequestBody RotaRequest req) {
        return rotas.opcoes(req);
    }

    @PostMapping("/registrar")
    public ResponseEntity<Map<String, Object>> registrar(@Valid @RequestBody RotaRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rotas.registrar(req));
    }

    @GetMapping
    public List<Map<String, Object>> doUsuario(@RequestParam int usuario) {
        return rotas.doUsuario(usuario);
    }
}
