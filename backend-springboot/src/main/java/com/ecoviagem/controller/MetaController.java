package com.ecoviagem.controller;

import com.ecoviagem.service.MetaService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Dados auxiliares para preencher formulários do frontend. */
@RestController
@RequestMapping("/api/meta")
public class MetaController {

    private final MetaService meta;

    public MetaController(MetaService meta) {
        this.meta = meta;
    }

    @GetMapping("/tipos-transporte")
    public List<Map<String, Object>> tiposTransporte() {
        return meta.tiposTransporte();
    }

    @GetMapping("/categorias-destino")
    public List<Map<String, Object>> categoriasDestino() {
        return meta.categoriasDestino();
    }
}
