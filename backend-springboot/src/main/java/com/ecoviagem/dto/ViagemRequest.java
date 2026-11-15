package com.ecoviagem.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** Dados para registrar uma viagem (com trechos e reserva opcional). */
public record ViagemRequest(
        @NotNull Integer idUsuario,
        @NotNull Integer idDestino,
        Integer idHospedagem,            // opcional: se vier, cria também a reserva
        @NotNull LocalDate dataInicio,
        @NotNull LocalDate dataFim,
        Integer numPessoas,
        List<TrechoRequest> trechos
) {
    public int pessoasOuUm() {
        return numPessoas == null ? 1 : numPessoas;
    }

    public List<TrechoRequest> trechosSeguros() {
        return trechos == null ? List.of() : trechos;
    }
}
