package com.ecoviagem.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dados reais sobre poluição e meio ambiente:
 *  - notícias atuais via feed RSS público do Google Notícias (sem chave),
 *    com cache de 30 min e fallback para uma curadoria caso a rede falhe;
 *  - indicadores-chave com fonte (OMS, PNUMA, IPCC, MapBiomas, Nature Climate Change).
 */
@Service
public class ImpactoService {

    private static final Logger log = LoggerFactory.getLogger(ImpactoService.class);
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);

    /** Temas de busca → consulta enviada ao Google Notícias. */
    public static final Map<String, String> TEMAS = new LinkedHashMap<>();
    static {
        TEMAS.put("poluicao", "poluição meio ambiente");
        TEMAS.put("clima", "mudanças climáticas impacto");
        TEMAS.put("oceanos", "poluição oceano plástico corais");
        TEMAS.put("florestas", "desmatamento queimadas Amazônia Pantanal");
        TEMAS.put("turismo", "turismo sustentável");
    }

    private record Cache(Instant em, List<Map<String, Object>> itens) {}
    private final Map<String, Cache> cache = new ConcurrentHashMap<>();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public Map<String, Object> noticias(String tema, int limite) {
        String chave = TEMAS.containsKey(tema) ? tema : "poluicao";
        int max = Math.max(1, Math.min(limite, 30));
        Cache c = cache.get(chave);
        boolean aoVivo = true;
        List<Map<String, Object>> itens;

        if (c != null && c.em().plus(CACHE_TTL).isAfter(Instant.now())) {
            itens = c.itens();
        } else {
            try {
                itens = buscarRss(TEMAS.get(chave), chave);
                if (itens.isEmpty()) throw new IllegalStateException("feed vazio");
                cache.put(chave, new Cache(Instant.now(), itens));
            } catch (Exception ex) {
                log.warn("Falha ao buscar notícias ({}): {}", chave, ex.getMessage());
                if (c != null) { itens = c.itens(); }          // cache vencido é melhor que nada
                else { itens = curadoria(); aoVivo = false; }
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tema", chave);
        out.put("temas", TEMAS.keySet());
        out.put("ao_vivo", aoVivo);
        out.put("fonte", aoVivo ? "Google Notícias (RSS)" : "Curadoria EcoViagem (sem conexão)");
        out.put("itens", itens.subList(0, Math.min(max, itens.size())));
        return out;
    }

    private List<Map<String, Object>> buscarRss(String consulta, String tema) throws Exception {
        String url = "https://news.google.com/rss/search?q=" + URLEncoder.encode(consulta, StandardCharsets.UTF_8)
                + "+when:30d&hl=pt-BR&gl=BR&ceid=BR:pt-419";
        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("User-Agent", "Mozilla/5.0 (compatible; EcoViagemBot/1.0)")
                .GET().build();
        HttpResponse<byte[]> res = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
        if (res.statusCode() != 200) throw new IllegalStateException("HTTP " + res.statusCode());

        Document doc = parserSeguro().newDocumentBuilder().parse(new ByteArrayInputStream(res.body()));
        NodeList items = doc.getElementsByTagName("item");
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < items.getLength() && out.size() < 30; i++) {
            Element it = (Element) items.item(i);
            String titulo = texto(it, "title");
            String fonte = texto(it, "source");
            // O Google anexa " - Fonte" ao título; removemos para exibir separado.
            if (!fonte.isEmpty() && titulo.endsWith(" - " + fonte)) {
                titulo = titulo.substring(0, titulo.length() - fonte.length() - 3);
            }
            String link = texto(it, "link");
            if (titulo.isEmpty() || !link.startsWith("https://")) continue;

            Map<String, Object> n = new LinkedHashMap<>();
            n.put("titulo", titulo);
            n.put("fonte", fonte.isEmpty() ? "Google Notícias" : fonte);
            n.put("link", link);
            n.put("data", isoData(texto(it, "pubDate")));
            n.put("tema", tema);
            out.add(n);
        }
        return out;
    }

    /** Parser XML com DTD/entidades externas desativadas (proteção contra XXE). */
    private static DocumentBuilderFactory parserSeguro() throws Exception {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        f.setFeature("http://xml.org/sax/features/external-general-entities", false);
        f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        f.setXIncludeAware(false);
        f.setExpandEntityReferences(false);
        return f;
    }

    private static String texto(Element el, String tag) {
        NodeList nl = el.getElementsByTagName(tag);
        return nl.getLength() == 0 ? "" : nl.item(0).getTextContent().trim();
    }

    private static String isoData(String rfc822) {
        try { return ZonedDateTime.parse(rfc822, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toString(); }
        catch (Exception e) { return null; }
    }

    /** Notícias reais selecionadas, usadas só quando o feed está inacessível. */
    private static List<Map<String, Object>> curadoria() {
        return List.of(
                n("MMA divulga relatório de qualidade do ar e amplia rede de monitoramento", "Agência Gov",
                        "https://agenciagov.ebc.com.br/noticias/202602/mma-divulga-relatorio-de-qualidade-do-ar-2025-e-registra-aumento-de-44-na-rede-de-monitoramento-desde-2022", "2026-02-01T12:00:00Z"),
                n("Área queimada no Brasil cai para 12,7 milhões de hectares em 2025, aponta MapBiomas", "Correio Braziliense",
                        "https://www.correiobraziliense.com.br/brasil/2026/07/7465394-area-queimada-no-brasil-cai-para-127-milhoes-de-hectares-em-2025-aponta-mapbiomas.html", "2026-07-01T12:00:00Z"),
                n("Queimadas aumentam em 23% a chance de doenças respiratórias", "Monitor Mercantil",
                        "https://monitormercantil.com.br/queimadas-aumentam-em-23-a-chance-de-doencas-respiratorias/", null),
                n("Pantanal é o bioma mais atingido por incêndios em 40 anos", "CNN Brasil",
                        "https://www.cnnbrasil.com.br/noticias/pantanal-e-o-bioma-mais-atingido-por-incendios-em-40-anos/", null),
                n("Mortes em massa de corais confirmam o primeiro ponto de virada climático", "ScienceAlert",
                        "https://www.sciencealert.com/mass-coral-die-offs-confirm-first-breach-of-a-major-climate-tipping-point", "2025-10-13T12:00:00Z"),
                n("Turismo responde por 8% das emissões globais de gases de efeito estufa", "Carbon Brief",
                        "https://www.carbonbrief.org/tourism-responsible-for-8-of-global-greenhouse-gas-emissions-study-finds", "2018-05-07T12:00:00Z"));
    }

    private static Map<String, Object> n(String titulo, String fonte, String link, String data) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("titulo", titulo); m.put("fonte", fonte); m.put("link", link);
        m.put("data", data); m.put("tema", "curadoria");
        return m;
    }

    /** Indicadores-chave com fonte verificável. */
    public List<Map<String, Object>> fatos() {
        return List.of(
                fato("💨", "7 milhões", "de mortes prematuras por ano ligadas à poluição do ar (externa + doméstica)",
                        "Saúde", "OMS", "https://www.who.int/news/item/02-05-2018-9-out-of-10-people-worldwide-breathe-polluted-air-but-more-countries-are-taking-action%EF%BB%BF"),
                fato("🌫️", "9 em 10", "pessoas no mundo respiram ar acima dos limites de poluição recomendados pela OMS",
                        "Saúde", "OMS", "https://www.who.int/news/item/02-05-2018-9-out-of-10-people-worldwide-breathe-polluted-air-but-more-countries-are-taking-action%EF%BB%BF"),
                fato("✈️", "8%", "das emissões globais de gases de efeito estufa vêm do turismo (transporte, hospedagem, alimentação, compras)",
                        "Turismo", "Lenzen et al., Nature Climate Change (2018)", "https://www.carbonbrief.org/tourism-responsible-for-8-of-global-greenhouse-gas-emissions-study-finds"),
                fato("🧴", "19–23 mi t", "de plástico chegam a rios, lagos e mares todos os anos",
                        "Oceanos", "PNUMA", "https://www.unep.org/topics/ocean-seas-and-coasts/ecosystem-degradation-pollution/plastic-pollution-and-marine-litter-0"),
                fato("📈", "até 3×", "pode crescer o plástico que chega aos ecossistemas aquáticos até 2040, sem ação (23–37 mi t/ano)",
                        "Oceanos", "PNUMA", "https://www.downtoearth.org.in/news/plastic-pollution-in-aquatic-systems-may-triple-by-2040-unep-79822"),
                fato("🪸", "70–90%", "dos recifes de coral podem desaparecer com 1,5 °C de aquecimento; com 2 °C, mais de 99%",
                        "Oceanos", "IPCC SR1.5 (2018)", "https://www.climatechangeauthority.gov.au/understanding-climate-threats-great-barrier-reef"),
                fato("🌡️", "84%", "da área de recifes do planeta sofreu calor de branqueamento no evento global de 2023–2025, o maior já registrado",
                        "Oceanos", "NOAA", "https://www.sciencealert.com/mass-coral-die-offs-confirm-first-breach-of-a-major-climate-tipping-point"),
                fato("🔥", "30 mi ha", "queimados no Brasil em 2024, 62% acima da média histórica",
                        "Florestas", "MapBiomas Fogo", "https://www.cnnbrasil.com.br/nacional/brasil/area-queimada-no-brasil-em-2024-supera-media-historica-em-62/"),
                fato("🐊", "+157%", "de área queimada no Pantanal em 2024 em relação à média histórica",
                        "Florestas", "MapBiomas Fogo", "https://www.campograndenews.com.br/brasil/cidades/pantanal-registrou-a-maior-proporcao-de-area-queimada-do-brasil-em-2024"),
                fato("🌳", "12,7 mi ha", "queimados no Brasil em 2025: metade de 2024, mostrando que políticas de combate funcionam",
                        "Florestas", "MapBiomas Fogo", "https://www.correiobraziliense.com.br/brasil/2026/07/7465394-area-queimada-no-brasil-cai-para-127-milhoes-de-hectares-em-2025-aponta-mapbiomas.html"));
    }

    private static Map<String, Object> fato(String icone, String valor, String texto, String tema, String fonte, String link) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("icone", icone); m.put("valor", valor); m.put("texto", texto);
        m.put("tema", tema); m.put("fonte", fonte); m.put("link", link);
        return m;
    }
}
