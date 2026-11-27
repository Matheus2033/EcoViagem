package com.ecoviagem.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Traduz exceções da aplicação e do banco em respostas HTTP claras.
 * Mantém os controllers e services livres de try/catch de HTTP.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<Map<String, String>> naoEncontrado(RecursoNaoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(ConflitoException.class)
    public ResponseEntity<Map<String, String>> conflito(ConflitoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("erro", ex.getMessage()));
    }

    /** Erros de validação dos DTOs (@Valid) -> 400 com os campos inválidos. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validacao(MethodArgumentNotValidException ex) {
        String campos = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(Map.of("erro", "Dados inválidos (" + campos + ")"));
    }

    /** Regras de negócio validadas no service (ex.: opção de rota inviável) → 400. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> argumentoInvalido(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Map<String, String>> duplicado(DuplicateKeyException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("erro", "Registro já existente (violação de restrição única)."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> integridade(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("erro", mensagemRaiz(ex)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> generico(Exception ex) {
        String msg = mensagemRaiz(ex);
        // Regras de negócio do banco (SIGNAL SQLSTATE '45000' nas triggers) → 409 com a mensagem.
        if (msg.contains("Capacidade do destino") || sinalDeRegra(ex)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("erro", msg));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("erro", msg));
    }

    private boolean sinalDeRegra(Throwable ex) {
        for (Throwable c = ex; c != null; c = c.getCause()) {
            if (c instanceof java.sql.SQLException sql && "45000".equals(sql.getSQLState())) return true;
        }
        return false;
    }

    private String mensagemRaiz(Throwable ex) {
        Throwable causa = ex;
        while (causa.getCause() != null) causa = causa.getCause();
        String msg = causa.getMessage();
        return (msg == null ? String.valueOf(ex.getMessage()) : msg.split("\n")[0]).trim();
    }
}
