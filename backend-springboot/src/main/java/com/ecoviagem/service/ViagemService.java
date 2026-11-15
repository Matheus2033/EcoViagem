package com.ecoviagem.service;

import com.ecoviagem.dto.TrechoRequest;
import com.ecoviagem.dto.ViagemRequest;
import com.ecoviagem.exception.ConflitoException;
import com.ecoviagem.exception.RecursoNaoEncontradoException;
import com.ecoviagem.repository.ReservaRepository;
import com.ecoviagem.repository.ViagemRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class ViagemService {

    private final ViagemRepository viagens;
    private final ReservaRepository reservas;

    public ViagemService(ViagemRepository viagens, ReservaRepository reservas) {
        this.viagens = viagens;
        this.reservas = reservas;
    }

    /**
     * Cria a viagem, seus trechos e (opcional) a reserva numa única transação.
     * Se a trigger de capacidade abortar a operação, tudo é desfeito (ROLLBACK).
     */
    @Transactional
    public Map<String, Object> criar(ViagemRequest req) {
        try {
            int idViagem = viagens.inserir(req);

            for (TrechoRequest trecho : req.trechosSeguros()) {
                viagens.inserirTrecho(idViagem, trecho);
            }
            if (req.idHospedagem() != null) {
                reservas.inserir(req.idUsuario(), req.idHospedagem(), idViagem,
                        req.dataInicio(), req.dataFim(), req.pessoasOuUm());
            }
            return Map.of("id_viagem", idViagem, "emissao_total_kg", viagens.pegadaTotal(idViagem));
        } catch (DataAccessException e) {
            // A trigger de superlotação lança SIGNAL; transformamos em conflito (409).
            if (mensagemRaiz(e).contains("Capacidade do destino")) {
                throw new ConflitoException(mensagemRaiz(e));
            }
            throw e;
        }
    }

    public List<Map<String, Object>> listarPorUsuario(int idUsuario) {
        return viagens.listarPorUsuario(idUsuario);
    }

    public Map<String, Object> detalhe(int id) {
        Map<String, Object> viagem = viagens.buscar(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Viagem não encontrada"));
        Map<String, Object> resposta = new java.util.HashMap<>(viagem);
        resposta.put("trechos", viagens.trechos(id));
        return resposta;
    }

    public Map<String, Object> alterarStatus(int id, String status) {
        if (viagens.atualizarStatus(id, status) == 0) {
            throw new RecursoNaoEncontradoException("Viagem não encontrada");
        }
        return Map.of("id_viagem", id, "status", status);
    }

    private String mensagemRaiz(Throwable e) {
        Throwable causa = e;
        while (causa.getCause() != null) causa = causa.getCause();
        String msg = causa.getMessage();
        return msg == null ? "" : msg;
    }
}
