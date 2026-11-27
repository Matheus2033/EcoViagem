package com.ecoviagem.controller;

import com.ecoviagem.dto.RegistroAcaoRequest;
import com.ecoviagem.dto.ResgateRequest;
import com.ecoviagem.service.EcoTokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** EcoTokens: relatar práticas sustentáveis, ver saldo e trocar por recompensas. */
@RestController
@RequestMapping("/api/eco")
public class EcoTokenController {

    private final EcoTokenService eco;

    public EcoTokenController(EcoTokenService eco) {
        this.eco = eco;
    }

    @GetMapping("/acoes")
    public List<Map<String, Object>> acoes(@RequestParam(required = false) Integer usuario) {
        return eco.acoes(usuario);
    }

    @GetMapping("/carteira")
    public Map<String, Object> carteira(@RequestParam int usuario) {
        return eco.carteira(usuario);
    }

    @PostMapping("/registros")
    public ResponseEntity<Map<String, Object>> registrar(@Valid @RequestBody RegistroAcaoRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eco.registrar(req));
    }

    @GetMapping("/recompensas")
    public List<Map<String, Object>> recompensas() {
        return eco.recompensas();
    }

    @PostMapping("/resgates")
    public ResponseEntity<Map<String, Object>> resgatar(@Valid @RequestBody ResgateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eco.resgatar(req));
    }

    @GetMapping("/ranking")
    public List<Map<String, Object>> ranking() {
        return eco.ranking();
    }
}
