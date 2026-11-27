package com.ecoviagem.dto;

import jakarta.validation.constraints.NotNull;

/** Troca de EcoTokens por uma recompensa. */
public record ResgateRequest(
        @NotNull Integer idUsuario,
        @NotNull Integer idRecompensa
) {}
