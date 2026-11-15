-- -----------------------------------------------------------------------------
-- 07_seed_extra.sql — Destinos adicionais (turismo sustentável no Brasil)
-- Executado no primeiro init (após 05) e aplicável manualmente no banco já ativo.
-- Usa subconsultas por NOME para não depender de IDs auto_increment.
-- -----------------------------------------------------------------------------
SET NAMES utf8mb4;

-- 1) Novos destinos -----------------------------------------------------------
INSERT INTO destino (nome, descricao, id_categoria, cidade, estado, pais, latitude, longitude, capacidade_maxima_diaria) VALUES
 ('Lençóis Maranhenses', 'Dunas brancas e lagoas de água doce; visitação sazonal controlada', (SELECT id_categoria FROM categoria_destino WHERE nome='Ecológico'), 'Barreirinhas',    'MA', 'Brasil',  -2.754900, -42.826500, 900),
 ('Ilha do Mel',         'Ilha sem carros, com trilhas, fortes históricos e praias limpas',   (SELECT id_categoria FROM categoria_destino WHERE nome='Praia'),     'Paranaguá',       'PR', 'Brasil', -25.530000, -48.320000, 600),
 ('Serra do Cipó',       'Cerrado de altitude, cachoeiras e cicloturismo',                    (SELECT id_categoria FROM categoria_destino WHERE nome='Montanha'),  'Santana do Riacho','MG','Brasil', -19.376000, -43.619000, 700),
 ('Alter do Chão',       'Praias de rio na Amazônia, o "Caribe amazônico"',                   (SELECT id_categoria FROM categoria_destino WHERE nome='Praia'),     'Santarém',        'PA', 'Brasil',  -2.507500, -54.947000, 800),
 ('Chapada Diamantina',  'Vales, grutas e trilhas de longo curso (Vale do Pati)',             (SELECT id_categoria FROM categoria_destino WHERE nome='Montanha'),  'Lençóis',         'BA', 'Brasil', -12.561400, -41.390300, 850),
 ('Praia do Rosa',       'Enseada preservada, point de observação de baleias-francas',        (SELECT id_categoria FROM categoria_destino WHERE nome='Praia'),     'Imbituba',        'SC', 'Brasil', -28.130000, -48.640000, 650);

-- 2) Hospedagens (nome único para permitir referência por nome) ----------------
INSERT INTO hospedagem (id_destino, id_tipo_hospedagem, nome, endereco, preco_diaria, capacidade, pegada_carbono_diaria, consumo_agua_litros_dia, usa_energia_renovavel) VALUES
 ((SELECT id_destino FROM destino WHERE nome='Lençóis Maranhenses'), (SELECT id_tipo_hospedagem FROM tipo_hospedagem WHERE nome='Pousada'),    'Eco Pousada Lençóis',      'Rua das Dunas, 100',      320.00, 40,  8.50, 180, TRUE),
 ((SELECT id_destino FROM destino WHERE nome='Ilha do Mel'),         (SELECT id_tipo_hospedagem FROM tipo_hospedagem WHERE nome='Pousada'),    'Pousada Farol da Ilha',    'Trilha do Farol, s/n',    280.00, 30,  6.00, 150, TRUE),
 ((SELECT id_destino FROM destino WHERE nome='Serra do Cipó'),       (SELECT id_tipo_hospedagem FROM tipo_hospedagem WHERE nome='Eco-resort'), 'Refúgio Serra do Cipó',    'Estrada do Cipó, km 12',  450.00, 50, 10.00, 200, TRUE),
 ((SELECT id_destino FROM destino WHERE nome='Alter do Chão'),       (SELECT id_tipo_hospedagem FROM tipo_hospedagem WHERE nome='Pousada'),    'Pousada Caribe Amazônico', 'Orla do Lago Verde, 45',  260.00, 35,  7.50, 170, FALSE),
 ((SELECT id_destino FROM destino WHERE nome='Chapada Diamantina'),  (SELECT id_tipo_hospedagem FROM tipo_hospedagem WHERE nome='Hostel'),     'Hostel Vale do Pati',      'Rua da Baderna, 20',      110.00, 24,  4.00,  90, TRUE),
 ((SELECT id_destino FROM destino WHERE nome='Praia do Rosa'),       (SELECT id_tipo_hospedagem FROM tipo_hospedagem WHERE nome='Camping'),    'Eco Camping do Rosa',      'Caminho da Praia, s/n',    90.00, 60,  3.00,  70, TRUE);

-- 3) Práticas sustentáveis das hospedagens ------------------------------------
INSERT INTO hospedagem_pratica (id_hospedagem, id_pratica)
SELECT h.id_hospedagem, p.id_pratica
FROM hospedagem h
JOIN pratica_sustentavel p ON p.nome IN ('Energia solar','Reuso de água','Contratação local')
WHERE h.nome = 'Eco Pousada Lençóis'
UNION ALL
SELECT h.id_hospedagem, p.id_pratica
FROM hospedagem h
JOIN pratica_sustentavel p ON p.nome IN ('Energia solar','Coleta seletiva','Limite de visitantes')
WHERE h.nome = 'Pousada Farol da Ilha'
UNION ALL
SELECT h.id_hospedagem, p.id_pratica
FROM hospedagem h
JOIN pratica_sustentavel p ON p.nome IN ('Energia solar','Compostagem','Reuso de água')
WHERE h.nome = 'Refúgio Serra do Cipó'
UNION ALL
SELECT h.id_hospedagem, p.id_pratica
FROM hospedagem h
JOIN pratica_sustentavel p ON p.nome IN ('Coleta seletiva','Contratação local')
WHERE h.nome = 'Pousada Caribe Amazônico'
UNION ALL
SELECT h.id_hospedagem, p.id_pratica
FROM hospedagem h
JOIN pratica_sustentavel p ON p.nome IN ('Energia solar','Compostagem','Limite de visitantes','Contratação local')
WHERE h.nome = 'Hostel Vale do Pati'
UNION ALL
SELECT h.id_hospedagem, p.id_pratica
FROM hospedagem h
JOIN pratica_sustentavel p ON p.nome IN ('Coleta seletiva','Reuso de água')
WHERE h.nome = 'Eco Camping do Rosa';

-- 4) Atividades (2 por destino) -----------------------------------------------
INSERT INTO atividade (id_destino, id_categoria_atividade, nome, descricao, impacto_ambiental, preco) VALUES
 ((SELECT id_destino FROM destino WHERE nome='Lençóis Maranhenses'), (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Trilha'),             'Travessia das dunas',                'Caminhada guiada entre as lagoas', 'BAIXO', 120.00),
 ((SELECT id_destino FROM destino WHERE nome='Lençóis Maranhenses'), (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Passeio de Barco'),    'Descida do Rio Preguiças',           'Passeio de barco até Caburé',      'MEDIO', 150.00),
 ((SELECT id_destino FROM destino WHERE nome='Ilha do Mel'),         (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Trilha'),             'Trilha da Gruta das Encantadas',     'Trilha costeira até a gruta',      'BAIXO',   0.00),
 ((SELECT id_destino FROM destino WHERE nome='Ilha do Mel'),         (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Observação de Fauna'), 'Observação de aves costeiras',       'Birdwatching na restinga',         'BAIXO',  60.00),
 ((SELECT id_destino FROM destino WHERE nome='Serra do Cipó'),       (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Trilha'),             'Cachoeira da Farofa',                'Trilha até a cachoeira',           'BAIXO',  40.00),
 ((SELECT id_destino FROM destino WHERE nome='Serra do Cipó'),       (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Ciclismo'),           'Cicloturismo no Parque',             'Passeio de bike pela estrada-parque','BAIXO', 50.00),
 ((SELECT id_destino FROM destino WHERE nome='Alter do Chão'),       (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Passeio de Barco'),    'Floresta Encantada',                 'Passeio de canoa no igapó',        'MEDIO', 130.00),
 ((SELECT id_destino FROM destino WHERE nome='Alter do Chão'),       (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Mergulho'),           'Mergulho no Lago Verde',             'Snorkeling em água doce',          'BAIXO',  90.00),
 ((SELECT id_destino FROM destino WHERE nome='Chapada Diamantina'),  (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Trilha'),             'Trekking Vale do Pati',              'Travessia de 3 dias no vale',      'BAIXO', 200.00),
 ((SELECT id_destino FROM destino WHERE nome='Chapada Diamantina'),  (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Mergulho'),           'Poço Azul',                          'Flutuação em caverna alagada',     'BAIXO',  80.00),
 ((SELECT id_destino FROM destino WHERE nome='Praia do Rosa'),       (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Observação de Fauna'), 'Observação de baleias-francas',      'Temporada de junho a novembro',    'BAIXO', 180.00),
 ((SELECT id_destino FROM destino WHERE nome='Praia do Rosa'),       (SELECT id_categoria_atividade FROM categoria_atividade WHERE nome='Trilha'),             'Trilha da Praia Vermelha',           'Mirante da enseada',               'BAIXO',   0.00);
