package com.ecoviagem.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Relato de uma prática sustentável feita pelo usuário (gera EcoTokens). */
public record RegistroAcaoRequest(
        @NotNull Integer idUsuario,
        @NotNull Integer idAcao,
        Integer idViagem,                       // opcional
        @Size(max = 500) String descricao
) {}
