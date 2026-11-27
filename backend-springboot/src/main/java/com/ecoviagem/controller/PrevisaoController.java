package com.ecoviagem.controller;

import com.ecoviagem.service.PrevisaoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * API de previsão: quando lugares/ecossistemas podem entrar em colapso se a
 * poluição continuar (ou cair/aumentar).
 *
 *   GET  /api/previsoes/extincao?cenario=reducao|atual|agravado
 *   GET  /api/previsoes/extincao?variacao=-30          (variação livre da poluição, em %)
 *   GET  /api/previsoes/extincao/{id}?cenario=...
 *   POST /api/previsoes/simular  {saude_atual, taxa_degradacao, sensibilidade, variacao}
 */
@RestController
@RequestMapping("/api/previsoes")
public class PrevisaoController {

    private final PrevisaoService previsoes;

    public PrevisaoController(PrevisaoService previsoes) {
        this.previsoes = previsoes;
    }

    @GetMapping("/extincao")
    public Map<String, Object> todos(@RequestParam(required = false) String cenario,
                                     @RequestParam(required = false) Double variacao) {
        return previsoes.projetarTodos(cenario, variacao);
    }

    @GetMapping("/extincao/{id}")
    public Map<String, Object> um(@PathVariable int id,
                                  @RequestParam(required = false) String cenario,
                                  @RequestParam(required = false) Double variacao) {
        return previsoes.projetarUm(id, cenario, variacao);
    }

    public record SimulacaoRequest(
            @NotNull @DecimalMin("0") @DecimalMax("100") Double saudeAtual,
            @NotNull @DecimalMin("0") @DecimalMax("50") Double taxaDegradacao,
            @NotNull @DecimalMin("0") @DecimalMax("1") Double sensibilidade,
            @DecimalMin("-100") @DecimalMax("200") Double variacao
    ) {}

    @PostMapping("/simular")
    public Map<String, Object> simular(@Valid @RequestBody SimulacaoRequest req) {
        return previsoes.simular(req.saudeAtual(), req.taxaDegradacao(), req.sensibilidade(),
                req.variacao() == null ? 0 : req.variacao());
    }
}
