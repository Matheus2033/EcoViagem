package com.ecoviagem.service;

import com.ecoviagem.exception.RecursoNaoEncontradoException;
import com.ecoviagem.repository.DestinoRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DestinoService {

    private final DestinoRepository destinos;

    public DestinoService(DestinoRepository destinos) {
        this.destinos = destinos;
    }

    public List<Map<String, Object>> listar(String categoria, String estado, String busca) {
        return destinos.listar(categoria, estado, busca);
    }

    /** Detalhe do destino com hospedagens, atividades, práticas e avaliações. */
    public Map<String, Object> detalhe(int id) {
        Map<String, Object> destino = destinos.buscar(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Destino não encontrado"));

        Map<String, Object> resposta = new HashMap<>(destino);
        resposta.put("hospedagens", destinos.hospedagens(id));
        resposta.put("atividades", destinos.atividades(id));
        resposta.put("praticas", destinos.praticas(id));
        resposta.put("avaliacoes", destinos.avaliacoes(id));
        return resposta;
    }
}
