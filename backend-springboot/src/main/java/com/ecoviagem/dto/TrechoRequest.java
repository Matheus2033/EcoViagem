package com.ecoviagem.dto;

import jakarta.validation.constraints.NotNull;

/** Um trecho de transporte de uma viagem (usado dentro de ViagemRequest). */
public record TrechoRequest(
        @NotNull Integer idTipoTransporte,
        String origem,
        String destino,
        @NotNull Double km
) {}
