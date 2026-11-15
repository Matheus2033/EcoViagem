package com.ecoviagem.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gera e valida códigos de uso único (2FA e recuperação de senha).
 * Armazenamento em memória com expiração — suficiente para o escopo da aplicação
 * (os códigos são de curta duração e não precisam sobreviver a reinícios).
 */
@Service
public class CodigoService {

    private static final long VALIDADE_MS = 10 * 60 * 1000; // 10 minutos
    private final SecureRandom random = new SecureRandom();
    private final ConcurrentHashMap<String, Entrada> store = new ConcurrentHashMap<>();

    private record Entrada(String codigo, long expiraEm) {}

    private String chave(String email, String finalidade) {
        return finalidade + ":" + email.trim().toLowerCase();
    }

    /** Gera um código de 6 dígitos para (email, finalidade) e o guarda. */
    public String gerar(String email, String finalidade) {
        String codigo = String.format("%06d", random.nextInt(1_000_000));
        store.put(chave(email, finalidade), new Entrada(codigo, Instant.now().toEpochMilli() + VALIDADE_MS));
        return codigo;
    }

    /** Valida e consome o código. Retorna true se confere e não expirou. */
    public boolean validar(String email, String finalidade, String codigo) {
        if (email == null || codigo == null) return false;
        String k = chave(email, finalidade);
        Entrada e = store.get(k);
        if (e == null) return false;
        if (Instant.now().toEpochMilli() > e.expiraEm()) { store.remove(k); return false; }
        boolean ok = e.codigo().equals(codigo.trim());
        if (ok) store.remove(k); // uso único
        return ok;
    }
}
