package com.ecoviagem.service;

import com.ecoviagem.repository.RelatorioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class RelatorioService {

    private final RelatorioRepository relatorios;

    public RelatorioService(RelatorioRepository relatorios) {
        this.relatorios = relatorios;
    }

    public Map<String, Object> indicadores()      { return relatorios.indicadores(); }
    public List<Map<String, Object>> sustentabilidade()   { return relatorios.sustentabilidade(); }
    public List<Map<String, Object>> pegadaPorCategoria() { return relatorios.pegadaPorCategoria(); }
    public List<Map<String, Object>> transporte()         { return relatorios.transporte(); }
    public List<Map<String, Object>> ocupacao()           { return relatorios.ocupacao(); }
}
