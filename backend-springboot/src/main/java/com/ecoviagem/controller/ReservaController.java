package com.ecoviagem.controller;

import com.ecoviagem.dto.ReservaRequest;
import com.ecoviagem.service.ReservaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Reservas de hospedagem (entidade RESERVA do mapa conceitual). */
@RestController
@RequestMapping("/api/reservas")
public class ReservaController {

    private final ReservaService reservas;

    public ReservaController(ReservaService reservas) {
        this.reservas = reservas;
    }

    @GetMapping
    public List<Map<String, Object>> listar(@RequestParam int usuario) {
        return reservas.listarPorUsuario(usuario);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> criar(@Valid @RequestBody ReservaRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservas.criar(req));
    }
}
