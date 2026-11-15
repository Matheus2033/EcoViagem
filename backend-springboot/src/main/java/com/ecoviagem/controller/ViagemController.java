package com.ecoviagem.controller;

import com.ecoviagem.dto.StatusRequest;
import com.ecoviagem.dto.ViagemRequest;
import com.ecoviagem.service.ViagemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Viagens dos usuários e sua pegada de carbono. */
@RestController
@RequestMapping("/api/viagens")
public class ViagemController {

    private final ViagemService viagens;

    public ViagemController(ViagemService viagens) {
        this.viagens = viagens;
    }

    @GetMapping
    public List<Map<String, Object>> listar(@RequestParam int usuario) {
        return viagens.listarPorUsuario(usuario);
    }

    @GetMapping("/{id}")
    public Map<String, Object> detalhe(@PathVariable int id) {
        return viagens.detalhe(id);
    }

    /** Cria viagem + trechos + reserva em transação (triggers calculam CO2 e valor). */
    @PostMapping
    public ResponseEntity<Map<String, Object>> criar(@Valid @RequestBody ViagemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(viagens.criar(req));
    }

    @PatchMapping("/{id}/status")
    public Map<String, Object> alterarStatus(@PathVariable int id, @Valid @RequestBody StatusRequest req) {
        return viagens.alterarStatus(id, req.status());
    }
}
