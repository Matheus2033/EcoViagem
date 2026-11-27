package com.ecoviagem.dto;

import jakarta.validation.constraints.*;

/** Coordenadas e contexto de um trajeto (usado para calcular e para registrar). */
public record RotaRequest(
        Integer idUsuario,                                   // obrigatório só para registrar
        @Size(max = 255) String origemNome,
        @Size(max = 255) String destinoNome,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double origemLat,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double origemLng,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double destinoLat,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double destinoLng,
        @Positive Double distanciaKm,                        // distância rodoviária real (Google/OSRM), se houver
        Boolean terrestre,                                   // false = sem rota por estrada (ilha etc.)
        String modo                                          // obrigatório só para registrar
) {}
