package com.ecoviagem.service;

import com.ecoviagem.exception.RecursoNaoEncontradoException;
import com.ecoviagem.repository.PrevisaoRepository;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.*;

/**
 * Modelo de previsão de colapso de ecossistemas sob diferentes cenários de poluição.
 *
 * Cada ecossistema tem:
 *   S0 = saúde atual (0–100), r = degradação anual (%) na tendência atual,
 *   s  = sensibilidade (0–1) da degradação à variação da poluição.
 *
 * Para uma variação de poluição v (−1 = zerar, 0 = manter, +1 = dobrar):
 *   r_ef = r × max(0, 1 + s·v)
 *   S(t) = S0 × (1 − r_ef/100)^t           (decaimento composto anual)
 *
 * O "colapso funcional" ocorre quando S(t) < 25 (o ecossistema perde a maior
 * parte das funções e da biodiversidade); abaixo de 10, considera-se extinção
 * funcional. É um modelo EDUCATIVO para comparar cenários, não uma previsão
 * científica oficial.
 */
@Service
public class PrevisaoService {

    public static final double LIMIAR_COLAPSO = 25.0;
    public static final double LIMIAR_EXTINCAO = 10.0;
    private static final int HORIZONTE = 2100;

    private static final Map<String, Double> CENARIOS = Map.of(
            "reducao", -0.5,    // poluição cai pela metade (metas do Acordo de Paris)
            "atual", 0.0,       // tendência atual
            "agravado", 0.5);   // poluição 50% maior

    private final PrevisaoRepository repo;

    public PrevisaoService(PrevisaoRepository repo) {
        this.repo = repo;
    }

    /** Converte cenário/variação (em %) no fator v ∈ [−1, +2]. */
    public double variacao(String cenario, Double variacaoPct) {
        if (variacaoPct != null) return Math.max(-1.0, Math.min(2.0, variacaoPct / 100.0));
        return CENARIOS.getOrDefault(cenario == null ? "atual" : cenario.toLowerCase(), 0.0);
    }

    public Map<String, Object> projetarTodos(String cenario, Double variacaoPct) {
        double v = variacao(cenario, variacaoPct);
        List<Map<String, Object>> itens = new ArrayList<>();
        for (Map<String, Object> e : repo.listar()) itens.add(projetar(e, v));
        // Mais urgente primeiro (sem ano crítico = fim da lista).
        itens.sort(Comparator.comparingInt(m -> m.get("ano_colapso") == null
                ? Integer.MAX_VALUE : ((Number) m.get("ano_colapso")).intValue()));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("cenario", cenario == null ? "atual" : cenario);
        out.put("variacao_poluicao_pct", Math.round(v * 100));
        out.put("ano_base", Year.now().getValue());
        out.put("limiar_colapso", LIMIAR_COLAPSO);
        out.put("limiar_extincao", LIMIAR_EXTINCAO);
        out.put("metodologia", "S(t) = S0 × (1 − r·max(0, 1 + s·v)/100)^t. Colapso funcional quando S < 25; "
                + "extinção funcional quando S < 10. Parâmetros estimados a partir das evidências citadas; "
                + "modelo educativo para comparar cenários de poluição.");
        out.put("ecossistemas", itens);
        return out;
    }

    public Map<String, Object> projetarUm(int id, String cenario, Double variacaoPct) {
        Map<String, Object> e = repo.buscar(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ecossistema não encontrado"));
        Map<String, Object> out = new LinkedHashMap<>(projetar(e, variacao(cenario, variacaoPct)));
        // Comparativo dos três cenários padrão para o mesmo lugar.
        Map<String, Object> comp = new LinkedHashMap<>();
        for (String nome : List.of("reducao", "atual", "agravado")) {
            comp.put(nome, projetar(e, CENARIOS.get(nome)).get("ano_colapso"));
        }
        out.put("comparativo_cenarios", comp);
        return out;
    }

    /** Simulação livre (POST): qualquer lugar a partir dos parâmetros informados. */
    public Map<String, Object> simular(double saude, double taxa, double sensibilidade, double variacaoPct) {
        Map<String, Object> e = new HashMap<>();
        e.put("nome", "Simulação personalizada");
        e.put("saude_atual", Math.max(0, Math.min(100, saude)));
        e.put("taxa_degradacao", Math.max(0, taxa));
        e.put("sensibilidade", Math.max(0, Math.min(1, sensibilidade)));
        return projetar(e, Math.max(-1.0, Math.min(2.0, variacaoPct / 100.0)));
    }

    /* ----------------------------------------------------------------------- */

    Map<String, Object> projetar(Map<String, Object> e, double v) {
        int anoBase = Year.now().getValue();
        double s0 = num(e.get("saude_atual"));
        double r = num(e.get("taxa_degradacao"));
        double sens = num(e.get("sensibilidade"));
        double rEf = r * Math.max(0.0, 1.0 + sens * v);
        double q = 1.0 - rEf / 100.0;

        List<Map<String, Object>> serie = new ArrayList<>();
        for (int ano = anoBase; ano <= HORIZONTE; ano += 5) {
            serie.add(Map.of("ano", ano, "saude", arred(s0 * Math.pow(q, ano - anoBase))));
        }
        if ((HORIZONTE - anoBase) % 5 != 0) {
            serie.add(Map.of("ano", HORIZONTE, "saude", arred(s0 * Math.pow(q, HORIZONTE - anoBase))));
        }

        Integer anoColapso = anoLimiar(s0, q, LIMIAR_COLAPSO, anoBase);
        Integer anoExtincao = anoLimiar(s0, q, LIMIAR_EXTINCAO, anoBase);
        double saude2050 = s0 * Math.pow(q, 2050 - anoBase);
        double saude2100 = s0 * Math.pow(q, HORIZONTE - anoBase);

        Map<String, Object> out = new LinkedHashMap<>(e);
        out.put("taxa_efetiva", arred(rEf));
        out.put("ano_colapso", anoColapso);
        out.put("ano_extincao", anoExtincao);
        out.put("saude_2050", arred(saude2050));
        out.put("saude_2100", arred(saude2100));
        out.put("risco", classificar(anoColapso, anoBase));
        out.put("serie", serie);
        return out;
    }

    /** Primeiro ano em que S(t) < limiar; null se não ocorrer até 2200. */
    private Integer anoLimiar(double s0, double q, double limiar, int anoBase) {
        if (s0 < limiar) return anoBase;
        if (q >= 1.0) return null;
        double t = Math.log(limiar / s0) / Math.log(q);
        int ano = anoBase + (int) Math.ceil(t);
        return ano > 2200 ? null : ano;
    }

    private String classificar(Integer anoColapso, int anoBase) {
        if (anoColapso == null || anoColapso > HORIZONTE) return "BAIXO";
        int anos = anoColapso - anoBase;
        if (anos <= 15) return "CRITICO";
        if (anos <= 35) return "ALTO";
        return "MODERADO";
    }

    private static double num(Object o) {
        return o == null ? 0.0 : ((Number) o).doubleValue();
    }

    private static double arred(double x) {
        return Math.round(x * 10.0) / 10.0;
    }
}
