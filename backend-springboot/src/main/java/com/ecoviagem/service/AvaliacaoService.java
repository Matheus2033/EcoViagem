package com.ecoviagem.service;

import com.ecoviagem.dto.AvaliacaoRequest;
import com.ecoviagem.exception.ConflitoException;
import com.ecoviagem.repository.AvaliacaoRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AvaliacaoService {

    private final AvaliacaoRepository avaliacoes;

    public AvaliacaoService(AvaliacaoRepository avaliacoes) {
        this.avaliacoes = avaliacoes;
    }

    public Map<String, Object> criar(AvaliacaoRequest req) {
        try {
            int id = avaliacoes.inserir(req);
            return avaliacoes.buscar(id);
        } catch (DuplicateKeyException e) {
            // UNIQUE (id_usuario, id_destino): o usuário já avaliou este destino.
            throw new ConflitoException("Você já avaliou este destino");
        }
    }
}
