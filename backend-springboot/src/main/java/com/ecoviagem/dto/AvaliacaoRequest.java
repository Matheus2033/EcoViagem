package com.ecoviagem.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Dados para avaliar um destino (nota de 1 a 5). */
public record AvaliacaoRequest(
        @NotNull Integer idUsuario,
        @NotNull Integer idDestino,
        @NotNull @Min(1) @Max(5) Integer nota,
        String comentario
) {}
