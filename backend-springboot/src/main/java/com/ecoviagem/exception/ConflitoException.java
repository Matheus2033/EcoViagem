package com.ecoviagem.exception;

/** Lançada em violações de regra de negócio ou de unicidade (vira HTTP 409). */
public class ConflitoException extends RuntimeException {
    public ConflitoException(String mensagem) {
        super(mensagem);
    }
}
