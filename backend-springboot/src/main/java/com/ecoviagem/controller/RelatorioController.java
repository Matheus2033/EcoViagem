package com.ecoviagem.controller;

import com.ecoviagem.service.RelatorioService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Relatórios e indicadores de sustentabilidade. */
@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {

    private final RelatorioService relatorios;

    public RelatorioController(RelatorioService relatorios) {
        this.relatorios = relatorios;
    }

    @GetMapping("/indicadores")
    public Map<String, Object> indicadores() {
        return relatorios.indicadores();
    }

    @GetMapping("/sustentabilidade")
    public List<Map<String, Object>> sustentabilidade() {
        return relatorios.sustentabilidade();
    }

    @GetMapping("/pegada-por-categoria")
    public List<Map<String, Object>> pegadaPorCategoria() {
        return relatorios.pegadaPorCategoria();
    }

    @GetMapping("/transporte")
    public List<Map<String, Object>> transporte() {
        return relatorios.transporte();
    }

    @GetMapping("/ocupacao")
    public List<Map<String, Object>> ocupacao() {
        return relatorios.ocupacao();
    }
}
