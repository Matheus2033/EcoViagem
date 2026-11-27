package com.ecoviagem.service;

import com.ecoviagem.repository.RecomendacaoRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RecomendacaoService {

    private final RecomendacaoRepository repo;

    public RecomendacaoService(RecomendacaoRepository repo) {
        this.repo = repo;
    }

    public Map<String, Object> recomendar(Integer idUsuario, int limite) {
        List<Map<String, Object>> destinos = new ArrayList<>();
        for (Map<String, Object> d : repo.destinos(idUsuario, Math.max(1, Math.min(limite, 20)))) {
            Map<String, Object> m = new LinkedHashMap<>(d);
            m.put("motivos", motivos(d));
            destinos.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("destinos", destinos);
        if (idUsuario != null) {
            Map<String, Object> perfil = repo.perfil(idUsuario);
            out.put("perfil", perfil);
            out.put("dicas", dicas(perfil));
        }
        return out;
    }

    private List<String> motivos(Map<String, Object> d) {
        List<String> m = new ArrayList<>();
        double indice = num(d.get("indice_sustentabilidade"));
        double ocup = num(d.get("percentual_ocupacao_hoje"));
        if (indice >= 70) m.add("Índice de sustentabilidade alto (" + Math.round(indice) + "/100)");
        else if (indice >= 45) m.add("Boas práticas ambientais (" + Math.round(indice) + "/100)");
        if (ocup < 40) m.add("Pouco movimento hoje: sem superlotação");
        if (num(d.get("qtd_hosp_renovavel")) > 0) m.add("Hospedagem com energia renovável");
        if (num(d.get("qtd_atividades_baixo_impacto")) > 0)
            m.add(Math.round(num(d.get("qtd_atividades_baixo_impacto"))) + " atividade(s) de baixo impacto");
        if (num(d.get("media_nota")) >= 4.5) m.add("Muito bem avaliado pelos viajantes");
        if (bool(d.get("afinidade")) && !bool(d.get("ja_visitado"))) m.add("Combina com o estilo das suas viagens");
        if (m.isEmpty()) m.add("Destino em ascensão na plataforma");
        return m.size() > 3 ? m.subList(0, 3) : m;
    }

    /** Dicas personalizadas a partir do histórico de viagens. */
    private List<String> dicas(Map<String, Object> p) {
        List<String> dicas = new ArrayList<>();
        double total = num(p.get("co2_total_kg"));
        double aviao = num(p.get("co2_aviao_kg"));
        if (num(p.get("qtd_viagens")) == 0) {
            dicas.add("Planeje sua primeira viagem pela aba Planejar Rota e compare o CO₂ de cada transporte.");
        }
        if (total > 0 && aviao / total > 0.5) {
            dicas.add(String.format(Locale.forLanguageTag("pt-BR"),
                    "%.0f%% da sua pegada vem de avião. Em trechos de até ~800 km, ônibus emite cerca de 70%% menos CO₂ por pessoa.",
                    aviao / total * 100));
        }
        if (total > 0) {
            dicas.add(String.format(Locale.forLanguageTag("pt-BR"),
                    "Suas viagens somam %.1f kg de CO₂. Uma árvore absorve em média ~22 kg por ano: seriam %d árvores para compensar.",
                    total, (int) Math.ceil(total / 22.0)));
        }
        dicas.add("Relate suas práticas sustentáveis na aba EcoTokens e troque por descontos e viagens.");
        return dicas;
    }

    private static double num(Object o) {
        return o instanceof Number n ? n.doubleValue() : 0.0;
    }

    private static boolean bool(Object o) {
        if (o instanceof Boolean b) return b;
        return o instanceof Number n && n.intValue() != 0;
    }
}
