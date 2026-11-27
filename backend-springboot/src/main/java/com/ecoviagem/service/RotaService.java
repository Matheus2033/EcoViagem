package com.ecoviagem.service;

import com.ecoviagem.dto.RotaRequest;
import com.ecoviagem.repository.EcoTokenRepository;
import com.ecoviagem.repository.RotaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Monta as opções de trajeto entre dois pontos (a pé, bike, ônibus, metrô/trem,
 * van, carona, carro, avião) com CO₂, tempo, custo estimado e EcoTokens.
 *
 * Os tokens são calculados AQUI (servidor), nunca vindos do navegador:
 *   CO₂ evitado = CO₂ do carro sozinho (ou do avião, se não há estrada) − CO₂ da opção escolhida
 *   tokens      = 5 + 0,5 × kg evitados  (+10 se for a pé/bike), máx. 150
 * A distância informada pelo cliente é limitada ao intervalo plausível em
 * relação à distância em linha reta entre as coordenadas.
 */
@Service
public class RotaService {

    // Custos médios estimados (R$) — referência para comparação, não preço real.
    private static final double GASOLINA_R_KM = 6.30 / 11.0;   // R$ 6,30/L ÷ 11 km/L
    private static final double PEDAGIO_R_KM = 0.10;            // trechos > 80 km
    private static final int OCUPANTES_CARONA = 3;
    private static final int MAX_TOKENS = 150;

    private record Modo(String id, String rotulo, String icone, String fator, String googleModo) {}

    private static final List<Modo> MODOS = List.of(
            new Modo("A_PE", "A pé", "🚶", "a pé", "WALKING"),
            new Modo("BICICLETA", "Bicicleta", "🚲", "bicicleta", "BICYCLING"),
            new Modo("TREM", "Metrô / trem urbano", "🚇", "trem", "TRANSIT"),
            new Modo("ONIBUS", "Ônibus", "🚌", "ônibus", "TRANSIT"),
            new Modo("VAN", "Van compartilhada", "🚐", "van", "DRIVING"),
            new Modo("CARONA", "Carona (3 pessoas)", "🧑‍🤝‍🧑", "carro", "DRIVING"),
            new Modo("CARRO", "Carro sozinho", "🚗", "carro", "DRIVING"),
            new Modo("AVIAO", "Avião", "✈️", "avião", null));

    private final RotaRepository repo;
    private final EcoTokenRepository eco;

    public RotaService(RotaRepository repo, EcoTokenRepository eco) {
        this.repo = repo;
        this.eco = eco;
    }

    public Map<String, Object> opcoes(RotaRequest req) {
        double reta = haversineKm(req.origemLat(), req.origemLng(), req.destinoLat(), req.destinoLng());
        if (reta < 0.2) throw new IllegalArgumentException("Origem e destino estão no mesmo lugar.");
        boolean terrestre = req.terrestre() == null || req.terrestre();
        double km = req.distanciaKm() == null
                ? reta * 1.25
                : Math.max(reta, Math.min(req.distanciaKm(), reta * 2.0 + 10));   // limite de plausibilidade
        Map<String, Double> fatores = repo.fatores();

        List<Map<String, Object>> lista = new ArrayList<>();
        for (Modo m : MODOS) {
            Map<String, Object> o = calcular(m, km, reta, terrestre, fatores);
            if (o != null) lista.add(o);
        }
        if (lista.isEmpty()) {
            throw new IllegalArgumentException("Não encontramos opções de transporte para este trajeto.");
        }

        // Linha de base: o carro sozinho (comparação mais comum e conservadora);
        // sem rota terrestre, a única referência é o avião. Carro/avião nunca geram tokens.
        double base = lista.stream().filter(o -> o.get("modo").equals("CARRO"))
                .mapToDouble(o -> (double) o.get("co2_kg")).findFirst()
                .orElse(lista.stream().mapToDouble(o -> (double) o.get("co2_kg")).max().orElse(0));
        for (Map<String, Object> o : lista) {
            double co2 = (double) o.get("co2_kg");
            double evitado = Math.max(0, base - co2);
            boolean ativo = o.get("modo").equals("A_PE") || o.get("modo").equals("BICICLETA");
            int tokens = evitado > 0.1 ? 5 + (int) Math.round(evitado * 0.5) : 0;
            if (ativo) tokens += 10;
            o.put("co2_evitado_kg", arred(evitado, 2));
            o.put("economia_co2_pct", base > 0 ? (int) Math.round(evitado / base * 100) : 0);
            o.put("tokens", Math.min(tokens, MAX_TOKENS));
        }

        // Etiquetas: mais limpa, mais rápida, mais barata e a recomendada
        // (a de menor CO₂; em empate, a mais rápida — ex.: bike antes de ir a pé).
        lista.sort(Comparator.<Map<String, Object>>comparingDouble(o -> (double) o.get("co2_kg"))
                .thenComparingDouble(o -> (double) o.get("tempo_min")));
        double tempoMin = lista.stream().mapToDouble(o -> (double) o.get("tempo_min")).min().orElse(0);
        double custoMin = lista.stream().mapToDouble(o -> (double) o.get("custo_reais")).min().orElse(0);
        double co2Min = (double) lista.get(0).get("co2_kg");
        Map<String, Object> recomendada = lista.get(0);
        for (Map<String, Object> o : lista) {
            List<String> tags = new ArrayList<>();
            if (o == recomendada) tags.add("RECOMENDADA");
            if ((double) o.get("co2_kg") == co2Min) tags.add("MAIS_LIMPA");
            if ((double) o.get("tempo_min") == tempoMin) tags.add("MAIS_RAPIDA");
            if ((double) o.get("custo_reais") == custoMin) tags.add("MAIS_BARATA");
            o.put("tags", tags);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("distancia_km", arred(km, 1));
        out.put("linha_reta_km", arred(reta, 1));
        out.put("terrestre", terrestre);
        out.put("co2_base_kg", arred(base, 2));
        out.put("opcoes", lista);
        if (req.idUsuario() != null) {
            out.put("registradas_hoje", repo.registradasHoje(req.idUsuario()));
            out.put("limite_diario", 3);
            out.put("modos_registrados", repo.modosHoje(req.idUsuario(),
                    req.origemLat(), req.origemLng(), req.destinoLat(), req.destinoLng()));
        }
        out.put("observacao", "CO₂ por pessoa (fatores do banco). Tempo e custo são estimativas médias; "
                + "com Google Maps o tempo real substitui a estimativa.");
        return out;
    }

    /** Registra a opção escolhida e credita os tokens calculados pelo servidor. */
    @Transactional
    public Map<String, Object> registrar(RotaRequest req) {
        if (req.idUsuario() == null || req.modo() == null) {
            throw new IllegalArgumentException("Informe o usuário e a opção de rota escolhida.");
        }
        Map<String, Object> calc = opcoes(req);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lista = (List<Map<String, Object>>) calc.get("opcoes");
        Map<String, Object> escolhida = lista.stream()
                .filter(o -> o.get("modo").equals(req.modo())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Esta opção não é viável para este trajeto."));
        int tokens = (int) escolhida.get("tokens");
        if (tokens <= 0) {
            throw new IllegalArgumentException("Esta opção não reduz emissões, então não gera EcoTokens.");
        }
        double km = escolhida.get("modo").equals("AVIAO")
                ? (double) calc.get("linha_reta_km") : (double) calc.get("distancia_km");

        repo.inserir(req.idUsuario(), nome(req.origemNome(), "Origem"), nome(req.destinoNome(), "Destino"),
                req.origemLat(), req.origemLng(), req.destinoLat(), req.destinoLng(), req.modo(),
                km, (double) escolhida.get("co2_kg"), (double) escolhida.get("co2_evitado_kg"), tokens);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tokens", tokens);
        out.put("co2_evitado_kg", escolhida.get("co2_evitado_kg"));
        out.put("modo", escolhida.get("rotulo"));
        out.put("saldo", eco.saldo(req.idUsuario()).get("saldo"));
        out.put("registradas_hoje", repo.registradasHoje(req.idUsuario()));
        return out;
    }

    public List<Map<String, Object>> doUsuario(int idUsuario) {
        return repo.doUsuario(idUsuario);
    }

    /* ----------------------------------------------------------------------- */

    private Map<String, Object> calcular(Modo m, double km, double reta, boolean terrestre, Map<String, Double> fatores) {
        double fator = fatores.getOrDefault(m.fator(), 0.0);
        double kmModo = km;
        double minutos;
        double custo;
        String detalhe;

        switch (m.id()) {
            case "A_PE" -> {
                if (!terrestre || km > 8) return null;
                minutos = km / 4.5 * 60; custo = 0;
                detalhe = "Zero emissão e ainda faz bem à saúde";
            }
            case "BICICLETA" -> {
                if (!terrestre || km > 35) return null;
                minutos = km / 15 * 60; custo = 0;
                detalhe = "Zero emissão; use ciclovias e bicicletários";
            }
            case "TREM" -> {
                if (!terrestre || km > 60) return null;
                minutos = km / 35 * 60 + 10; custo = 5.20;
                detalhe = "Onde houver metrô/trem; tarifa urbana média";
            }
            case "ONIBUS" -> {
                if (!terrestre) return null;
                if (km <= 40) { minutos = km / 20 * 60 + 10; custo = 5.00; detalhe = "Ônibus urbano/metropolitano"; }
                else { minutos = km / 60 * 60 + 30; custo = 10 + km * 0.30; detalhe = "Ônibus rodoviário, saindo da rodoviária"; }
            }
            case "VAN" -> {
                if (!terrestre || km < 15 || km > 600) return null;
                minutos = km / 60 * 60 + 15; custo = 5 + km * 0.40;
                detalhe = "Vans e transfers compartilhados";
            }
            case "CARONA" -> {
                if (!terrestre || km < 15) return null;
                fator = fator / OCUPANTES_CARONA;
                minutos = tempoCarro(km) + 15;
                custo = custoCarro(km) / OCUPANTES_CARONA;
                detalhe = "Combustível e pedágio divididos por 3 (apps de carona)";
            }
            case "CARRO" -> {
                if (!terrestre) return null;
                minutos = tempoCarro(km); custo = custoCarro(km);
                detalhe = "Gasolina a R$ 6,30/L, 11 km/L" + (km > 80 ? " + pedágios estimados" : "");
            }
            case "AVIAO" -> {
                if (terrestre && reta < 250) return null;
                kmModo = reta * 1.1;                       // rota aérea ~10% maior que a linha reta
                minutos = kmModo / 750 * 60 + 150;         // + 2h30 de aeroporto (check-in, deslocamento)
                custo = 250 + kmModo * 0.40;
                detalhe = "Inclui ~2h30 de aeroporto; maior emissão por km";
            }
            default -> { return null; }
        }

        Map<String, Object> o = new LinkedHashMap<>();
        o.put("modo", m.id());
        o.put("rotulo", m.rotulo());
        o.put("icone", m.icone());
        o.put("google_modo", m.googleModo());
        o.put("distancia_km", arred(kmModo, 1));
        o.put("co2_kg", arred(fator * kmModo, 2));
        o.put("tempo_min", (double) Math.round(minutos));
        o.put("custo_reais", arred(custo, 2));
        o.put("detalhe", detalhe);
        return o;
    }

    private static double tempoCarro(double km) {
        return km <= 40 ? km / 30 * 60 : km / 80 * 60;
    }

    private static double custoCarro(double km) {
        return km * GASOLINA_R_KM + (km > 80 ? km * PEDAGIO_R_KM : 0);
    }

    private static String nome(String s, String padrao) {
        if (s == null || s.isBlank()) return padrao;
        String t = s.trim();
        return t.length() > 255 ? t.substring(0, 255) : t;
    }

    static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371, dLat = Math.toRadians(lat2 - lat1), dLng = Math.toRadians(lng2 - lng1);
        double s = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * r * Math.asin(Math.sqrt(s));
    }

    private static double arred(double x, int casas) {
        double f = Math.pow(10, casas);
        return Math.round(x * f) / f;
    }
}
