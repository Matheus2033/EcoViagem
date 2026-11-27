package com.ecoviagem.controller;

import com.ecoviagem.service.RecomendacaoService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Recomendações de destinos sustentáveis e dicas personalizadas. */
@RestController
@RequestMapping("/api/recomendacoes")
public class RecomendacaoController {

    private final RecomendacaoService recomendacoes;

    public RecomendacaoController(RecomendacaoService recomendacoes) {
        this.recomendacoes = recomendacoes;
    }

    @GetMapping
    public Map<String, Object> recomendar(@RequestParam(required = false) Integer usuario,
                                          @RequestParam(defaultValue = "6") int limite) {
        return recomendacoes.recomendar(usuario, limite);
    }
}
