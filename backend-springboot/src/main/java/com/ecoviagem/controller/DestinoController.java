package com.ecoviagem.controller;

import com.ecoviagem.service.DestinoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Catálogo de destinos turísticos. */
@RestController
@RequestMapping("/api/destinos")
public class DestinoController {

    private final DestinoService destinos;

    public DestinoController(DestinoService destinos) {
        this.destinos = destinos;
    }

    /** Lista destinos ordenados por índice de sustentabilidade. Filtros opcionais. */
    @GetMapping
    public List<Map<String, Object>> listar(
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String busca) {
        return destinos.listar(categoria, estado, busca);
    }

    @GetMapping("/{id}")
    public Map<String, Object> detalhe(@PathVariable int id) {
        return destinos.detalhe(id);
    }
}
