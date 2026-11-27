package com.ecoviagem.service;

import com.ecoviagem.dto.RegistroAcaoRequest;
import com.ecoviagem.dto.ResgateRequest;
import com.ecoviagem.repository.EcoTokenRepository;
import com.ecoviagem.repository.RotaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EcoTokenService {

    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I
    private final SecureRandom random = new SecureRandom();
    private final EcoTokenRepository repo;
    private final RotaRepository rotas;

    public EcoTokenService(EcoTokenRepository repo, RotaRepository rotas) {
        this.repo = repo;
        this.rotas = rotas;
    }

    public List<Map<String, Object>> acoes(Integer idUsuario) {
        List<Map<String, Object>> acoes = repo.acoes();
        if (idUsuario == null) return acoes;
        Map<Object, Object> usos = new HashMap<>();
        repo.usosHoje(idUsuario).forEach(r -> usos.put(((Number) r.get("id_acao")).intValue(), r.get("usos")));
        return acoes.stream().map(a -> {
            Map<String, Object> m = new HashMap<>(a);
            m.put("usos_hoje", usos.getOrDefault(((Number) a.get("id_acao")).intValue(), 0));
            return m;
        }).toList();
    }

    public Map<String, Object> carteira(int idUsuario) {
        return Map.of(
                "saldo", repo.saldo(idUsuario),
                "registros", repo.registros(idUsuario),
                "rotas", rotas.doUsuario(idUsuario),
                "resgates", repo.resgates(idUsuario));
    }

    /** Registra a prática; a trigger define os tokens e barra o excesso diário. */
    @Transactional
    public Map<String, Object> registrar(RegistroAcaoRequest req) {
        String descricao = req.descricao() == null ? null : req.descricao().trim();
        repo.inserirRegistro(req.idUsuario(), req.idAcao(), req.idViagem(),
                descricao == null || descricao.isEmpty() ? null : descricao);
        return repo.saldo(req.idUsuario());
    }

    public List<Map<String, Object>> recompensas() {
        return repo.recompensas();
    }

    /** Resgata uma recompensa em transação: a trigger valida saldo e estoque. */
    @Transactional
    public Map<String, Object> resgatar(ResgateRequest req) {
        repo.travarUsuario(req.idUsuario());
        int id = repo.inserirResgate(req.idUsuario(), req.idRecompensa(), novoVoucher());
        Map<String, Object> out = new HashMap<>(repo.resgate(id));
        out.put("saldo", repo.saldo(req.idUsuario()).get("saldo"));
        return out;
    }

    public List<Map<String, Object>> ranking() {
        return repo.ranking();
    }

    private String novoVoucher() {
        StringBuilder sb = new StringBuilder("ECO");
        for (int i = 0; i < 9; i++) sb.append(ALFABETO.charAt(random.nextInt(ALFABETO.length())));
        return sb.toString();
    }
}
