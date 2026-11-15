package com.ecoviagem.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

/** Dados para cadastrar um novo usuário. */
public record RegistroRequest(
        @NotBlank String nome,
        @NotBlank @Email String email,
        @NotBlank String senha,
        String cpf,
        LocalDate dataNascimento
) {}
