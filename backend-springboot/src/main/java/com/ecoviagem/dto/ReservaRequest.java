package com.ecoviagem.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/** Dados para criar uma reserva de hospedagem avulsa. */
public record ReservaRequest(
        @NotNull Integer idUsuario,
        @NotNull Integer idHospedagem,
        Integer idViagem,                // opcional
        @NotNull LocalDate dataCheckin,
        @NotNull LocalDate dataCheckout,
        Integer numHospedes
) {
    public int hospedesOuUm() {
        return numHospedes == null ? 1 : numHospedes;
    }
}
