package com.ecoviagem.service;

import com.ecoviagem.repository.MetaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MetaService {

    private final MetaRepository meta;

    public MetaService(MetaRepository meta) {
        this.meta = meta;
    }

    public List<Map<String, Object>> tiposTransporte()   { return meta.tiposTransporte(); }
    public List<Map<String, Object>> categoriasDestino() { return meta.categoriasDestino(); }
}
