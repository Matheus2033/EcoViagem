package com.ecoviagem.controller;

import com.ecoviagem.service.ImpactoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Dados reais: notícias atuais sobre poluição/meio ambiente e indicadores com fonte. */
@RestController
@RequestMapping("/api/impacto")
public class ImpactoController {

    private final ImpactoService impacto;

    public ImpactoController(ImpactoService impacto) {
        this.impacto = impacto;
    }

    @GetMapping("/noticias")
    public Map<String, Object> noticias(@RequestParam(defaultValue = "poluicao") String tema,
                                        @RequestParam(defaultValue = "12") int limite) {
        return impacto.noticias(tema, limite);
    }

    @GetMapping("/fatos")
    public List<Map<String, Object>> fatos() {
        return impacto.fatos();
    }
}
