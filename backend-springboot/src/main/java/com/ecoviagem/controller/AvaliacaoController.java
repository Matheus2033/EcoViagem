package com.ecoviagem.controller;

import com.ecoviagem.dto.AvaliacaoRequest;
import com.ecoviagem.service.AvaliacaoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Avaliações de destinos (regra: 1 por usuário/destino - UNIQUE no banco). */
@RestController
@RequestMapping("/api/avaliacoes")
public class AvaliacaoController {

    private final AvaliacaoService avaliacoes;

    public AvaliacaoController(AvaliacaoService avaliacoes) {
        this.avaliacoes = avaliacoes;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> criar(@Valid @RequestBody AvaliacaoRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(avaliacoes.criar(req));
    }
}
