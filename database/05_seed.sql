-- =============================================================================
-- EcoViagem - Script 05: DADOS DE TESTE (SEED)
-- Carga inicial para demonstração e testes das consultas/relatórios.
-- Observação: a senha de todos os usuários de demonstração é "senha123"
--             (armazenada como hash bcrypt - nunca em texto puro).
-- =============================================================================
USE ecoviagem;
SET NAMES utf8mb4;

-- 1) Categorias de destino -----------------------------------------------------
INSERT INTO categoria_destino (nome, descricao) VALUES
 ('Ecológico',  'Áreas naturais protegidas e ecoturismo'),
 ('Praia',      'Destinos litorâneos'),
 ('Montanha',   'Serras e áreas de altitude'),
 ('Cultural',   'Patrimônio histórico e cultural'),
 ('Rural',      'Turismo rural e agroturismo');

-- 2) Tipos de hospedagem -------------------------------------------------------
INSERT INTO tipo_hospedagem (nome) VALUES
 ('Eco-resort'), ('Pousada'), ('Hotel'), ('Camping'), ('Hostel');

-- 3) Certificações ambientais --------------------------------------------------
INSERT INTO certificacao_ambiental (nome, orgao_emissor, descricao) VALUES
 ('Green Key',       'Foundation for Environmental Education', 'Selo internacional de turismo sustentável'),
 ('LEED',            'U.S. Green Building Council',            'Construção sustentável'),
 ('ISO 14001',       'ISO',                                   'Gestão ambiental'),
 ('Selo Verde ABNT', 'ABNT',                                  'Certificação ambiental nacional');

-- 4) Tipos de transporte (fator de emissão kg CO2 / km / pessoa) ---------------
INSERT INTO tipo_transporte (nome, fator_emissao_co2_km) VALUES
 ('Avião',       0.2500),
 ('Carro',       0.1920),
 ('Ônibus',      0.0680),
 ('Van',         0.1030),
 ('Trem',        0.0410),
 ('Bicicleta',   0.0000),
 ('A pé',        0.0000);

-- 5) Categorias de atividade ---------------------------------------------------
INSERT INTO categoria_atividade (nome) VALUES
 ('Trilha'), ('Mergulho'), ('Observação de Fauna'),
 ('Visita Cultural'), ('Passeio de Barco'), ('Ciclismo');

-- 6) Práticas sustentáveis -----------------------------------------------------
INSERT INTO pratica_sustentavel (nome, descricao, categoria) VALUES
 ('Energia solar',          'Geração própria de energia renovável',      'Energia'),
 ('Reuso de água',          'Captação e reaproveitamento de água',       'Água'),
 ('Coleta seletiva',        'Separação e reciclagem de resíduos',        'Resíduos'),
 ('Compostagem',            'Tratamento de resíduos orgânicos',          'Resíduos'),
 ('Contratação local',      'Geração de emprego na comunidade local',    'Social'),
 ('Limite de visitantes',   'Controle de carga turística diária',        'Social'),
 ('Produtos orgânicos',     'Alimentação de produtores locais orgânicos','Social');

-- 7) Usuários (senha de demo: "senha123") -------------------------------------
INSERT INTO usuario (nome, email, senha_hash, cpf, data_nascimento, tipo_usuario) VALUES
 ('Administrador',    'admin@ecoviagem.com', '$2a$10$qA20du9hUqgAfqfkWhPES.L/ZjsFXDOdeI/.1tfI63P37CQgvpGMC', '00000000191', '1990-01-01', 'ADMIN'),
 ('Maria Gestora',    'maria@ecoviagem.com', '$2a$10$qA20du9hUqgAfqfkWhPES.L/ZjsFXDOdeI/.1tfI63P37CQgvpGMC', '11111111111', '1988-05-12', 'GESTOR'),
 ('João Turista',     'joao@email.com',      '$2a$10$qA20du9hUqgAfqfkWhPES.L/ZjsFXDOdeI/.1tfI63P37CQgvpGMC', '22222222222', '1995-09-20', 'TURISTA'),
 ('Ana Viajante',     'ana@email.com',       '$2a$10$qA20du9hUqgAfqfkWhPES.L/ZjsFXDOdeI/.1tfI63P37CQgvpGMC', '33333333333', '2000-03-15', 'TURISTA'),
 ('Carlos Mochileiro','carlos@email.com',    '$2a$10$qA20du9hUqgAfqfkWhPES.L/ZjsFXDOdeI/.1tfI63P37CQgvpGMC', '44444444444', '1992-11-30', 'TURISTA');

-- 8) Destinos ------------------------------------------------------------------
INSERT INTO destino (nome, descricao, id_categoria, cidade, estado, pais, latitude, longitude, capacidade_maxima_diaria) VALUES
 ('Bonito',                 'Ecoturismo com rios cristalinos e grutas',        1, 'Bonito',            'MS', 'Brasil', -21.129500, -56.482100, 1500),
 ('Fernando de Noronha',    'Arquipélago com controle rígido de visitação',    2, 'Fernando de Noronha','PE','Brasil',  -3.854000, -32.423400,  460),
 ('Chapada dos Veadeiros',  'Cerrado, cachoeiras e trilhas',                   1, 'Alto Paraíso',      'GO', 'Brasil', -14.133300, -47.516700, 1200),
 ('Jalapão',                'Dunas, fervedouros e turismo de base comunitária',1, 'Mateiros',          'TO', 'Brasil', -10.533300, -46.416700,  800),
 ('Ilha Grande',            'Ilha sem carros, trilhas e praias preservadas',   2, 'Angra dos Reis',    'RJ', 'Brasil', -23.143900, -44.173600, 1000),
 ('Serra da Mantiqueira',   'Montanhas, turismo rural e produção orgânica',    3, 'Gonçalves',         'MG', 'Brasil', -22.655000, -45.855000,  900);

-- 9) Hospedagens ---------------------------------------------------------------
INSERT INTO hospedagem (id_destino, id_tipo_hospedagem, nome, endereco, preco_diaria, capacidade, pegada_carbono_diaria, consumo_agua_litros_dia, usa_energia_renovavel) VALUES
 (1, 1, 'Eco Resort Águas de Bonito', 'Rodovia Bonito km 5',   680.00, 120, 6.50, 2500, TRUE),
 (1, 2, 'Pousada Olho d''Água',       'Centro, Bonito',        320.00,  40, 9.00, 1800, FALSE),
 (2, 1, 'Pousada Maravilha Noronha',  'Baía Sueste',          1900.00,  30, 4.20, 1200, TRUE),
 (3, 2, 'Pousada Trilha do Cerrado',  'Alto Paraíso',          280.00,  35, 7.50, 1500, TRUE),
 (3, 4, 'Camping Veadeiros',          'Entrada do Parque',      90.00,  60, 2.00,  600, FALSE),
 (4, 2, 'Pousada Dunas do Jalapão',   'Mateiros',              360.00,  25, 8.00, 1300, FALSE),
 (5, 5, 'Hostel Vila do Abraão',      'Vila do Abraão',        120.00,  50, 5.00, 1000, TRUE),
 (6, 2, 'Pousada Mantiqueira Verde',  'Gonçalves',             400.00,  28, 3.50,  900, TRUE);

-- 10) Certificações das hospedagens -------------------------------------------
INSERT INTO hospedagem_certificacao (id_hospedagem, id_certificacao, data_emissao, data_validade) VALUES
 (1, 1, '2024-01-10', '2027-01-10'),
 (1, 3, '2023-06-01', '2026-06-01'),
 (3, 1, '2024-03-15', '2027-03-15'),
 (3, 2, '2023-09-20', '2026-09-20'),
 (4, 4, '2024-02-01', '2027-02-01'),
 (8, 1, '2024-05-05', '2027-05-05');

-- 11) Práticas sustentáveis adotadas por cada HOSPEDAGEM -----------------------
INSERT INTO hospedagem_pratica (id_hospedagem, id_pratica) VALUES
 (1,1),(1,2),(1,3),(1,6),      -- Eco Resort Águas de Bonito
 (2,3),                        -- Pousada Olho d'Água
 (3,1),(3,2),(3,3),(3,5),(3,6),-- Pousada Maravilha Noronha
 (4,1),(4,4),(4,5),            -- Pousada Trilha do Cerrado
 (5,3),                        -- Camping Veadeiros
 (6,5),(6,6),                  -- Pousada Dunas do Jalapão
 (7,2),(7,3),(7,6),            -- Hostel Vila do Abraão
 (8,1),(8,4),(8,5),(8,7);      -- Pousada Mantiqueira Verde

-- 12) Atividades ---------------------------------------------------------------
INSERT INTO atividade (id_destino, id_categoria_atividade, nome, descricao, impacto_ambiental, preco) VALUES
 (1, 2, 'Flutuação no Rio da Prata',  'Flutuação em rio de águas cristalinas', 'BAIXO', 250.00),
 (1, 1, 'Gruta do Lago Azul',         'Visita guiada à gruta',                 'BAIXO', 120.00),
 (2, 2, 'Mergulho na Baía dos Golfinhos','Mergulho com instrutor',             'MEDIO', 400.00),
 (2, 1, 'Trilha Atalaia',             'Trilha com piscina natural',            'BAIXO',  90.00),
 (3, 1, 'Trilha dos Saltos',          'Trilha até cachoeiras',                 'BAIXO',  80.00),
 (3, 3, 'Observação de aves do Cerrado','Birdwatching guiado',                 'BAIXO', 150.00),
 (4, 5, 'Fervedouros',                'Banho em nascentes de água cristalina', 'BAIXO', 110.00),
 (5, 1, 'Trilha Lopes Mendes',        'Trilha até uma das praias mais bonitas','BAIXO',   0.00),
 (6, 6, 'Cicloturismo na Serra',      'Passeio de bicicleta pela montanha',    'BAIXO',  60.00);

-- 13) Viagens (a trigger valida capacidade do destino) -------------------------
INSERT INTO viagem (id_usuario, id_destino, data_inicio, data_fim, num_pessoas, status) VALUES
 (3, 1, '2026-12-01', '2026-12-05', 2, 'CONFIRMADA'),  -- viagem 1
 (4, 3, '2026-11-20', '2026-11-24', 1, 'CONCLUIDA'),   -- viagem 2
 (5, 5, '2027-01-10', '2027-01-15', 3, 'RESERVADA'),   -- viagem 3
 (3, 2, '2027-02-01', '2027-02-04', 2, 'RESERVADA'),   -- viagem 4
 (4, 4, '2026-10-05', '2026-10-09', 2, 'CONCLUIDA');   -- viagem 5

-- 14) Trechos de transporte (emissao_co2_kg é calculada por trigger) -----------
INSERT INTO trecho_transporte (id_viagem, id_tipo_transporte, origem, destino_trecho, distancia_km) VALUES
 (1, 1, 'São Paulo', 'Campo Grande', 900.00),   -- avião
 (1, 4, 'Campo Grande', 'Bonito',    300.00),   -- van
 (2, 2, 'Brasília', 'Alto Paraíso',  230.00),   -- carro
 (3, 3, 'Rio de Janeiro', 'Angra',   160.00),   -- ônibus
 (3, 5, 'Angra', 'Ilha Grande',       20.00),   -- barco (usa fator de trem como aproximação)
 (4, 1, 'São Paulo', 'Recife',      2650.00),   -- avião
 (4, 1, 'Recife', 'Noronha',         545.00),   -- avião
 (5, 2, 'Palmas', 'Mateiros',        330.00);   -- carro

-- 15) Reservas de hospedagem (valor_total calculado por trigger) ---------------
INSERT INTO reserva (id_usuario, id_hospedagem, id_viagem, data_checkin, data_checkout, num_hospedes, status) VALUES
 (3, 1, 1, '2026-12-01', '2026-12-05', 2, 'CONFIRMADA'),
 (4, 4, 2, '2026-11-20', '2026-11-24', 1, 'CONCLUIDA'),
 (5, 7, 3, '2027-01-10', '2027-01-15', 3, 'RESERVADA'),
 (3, 3, 4, '2027-02-01', '2027-02-04', 2, 'RESERVADA'),
 (4, 6, 5, '2026-10-05', '2026-10-09', 2, 'CONCLUIDA');

-- 16) Atividades realizadas em cada viagem -------------------------------------
INSERT INTO viagem_atividade (id_viagem, id_atividade) VALUES
 (1,1),(1,2),
 (2,5),(2,6),
 (3,8),
 (4,3),(4,4),
 (5,7);

-- 17) Avaliações ---------------------------------------------------------------
INSERT INTO avaliacao (id_usuario, id_destino, nota, comentario) VALUES
 (3, 1, 5, 'Experiência incrível e muito bem organizada em termos de sustentabilidade.'),
 (4, 3, 4, 'Trilhas lindas, mas faltou mais transporte coletivo.'),
 (5, 5, 5, 'Ilha sem carros, silêncio e natureza preservada.'),
 (4, 4, 5, 'Turismo de base comunitária excelente.'),
 (3, 2, 4, 'Controle de visitação garante a preservação.');

