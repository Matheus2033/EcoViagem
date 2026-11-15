-- =============================================================================
-- EcoViagem - Script 04: SEGURANÇA e ADMINISTRAÇÃO DE DADOS  (MySQL 8)
-- Perfis de acesso (roles), privilégios com GRANT / REVOKE (menor privilégio).
-- =============================================================================
USE ecoviagem;
SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1) PAPÉIS (roles) - definem o "perfil de acesso"
-- -----------------------------------------------------------------------------
CREATE ROLE IF NOT EXISTS perfil_admin, perfil_gestor, perfil_turista, perfil_bi;

-- -----------------------------------------------------------------------------
-- 2) USUÁRIOS DE BANCO (com login) vinculados aos perfis
--    A API da aplicação conecta como "app_api". Troque as senhas em produção.
-- -----------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'app_api'@'%'      IDENTIFIED BY 'app_api_senha';
CREATE USER IF NOT EXISTS 'gestor_maria'@'%' IDENTIFIED BY 'gestor_senha';
CREATE USER IF NOT EXISTS 'analista_bi'@'%'  IDENTIFIED BY 'bi_senha';

GRANT perfil_turista TO 'app_api'@'%';        -- a API opera com privilégios de turista
GRANT perfil_gestor  TO 'gestor_maria'@'%';
GRANT perfil_bi      TO 'analista_bi'@'%';

-- Ativa o papel automaticamente a cada conexão
SET DEFAULT ROLE ALL TO 'app_api'@'%', 'gestor_maria'@'%', 'analista_bi'@'%';

-- -----------------------------------------------------------------------------
-- 3) PRIVILÉGIOS
-- -----------------------------------------------------------------------------

-- ADMIN: controle total do banco
GRANT ALL PRIVILEGES ON ecoviagem.* TO perfil_admin;

-- BI: somente leitura de tudo (ideal para dashboards e relatórios)
GRANT SELECT ON ecoviagem.* TO perfil_bi;

-- GESTOR: gerencia o catálogo (CRUD) e lê o restante -----------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.destino                 TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.hospedagem              TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.hospedagem_certificacao TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.hospedagem_pratica      TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.atividade               TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.categoria_destino       TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.tipo_hospedagem         TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.certificacao_ambiental  TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.categoria_atividade     TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.pratica_sustentavel     TO perfil_gestor;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.tipo_transporte         TO perfil_gestor;
GRANT SELECT ON ecoviagem.usuario           TO perfil_gestor;
GRANT SELECT ON ecoviagem.viagem            TO perfil_gestor;
GRANT SELECT ON ecoviagem.reserva           TO perfil_gestor;
GRANT SELECT ON ecoviagem.avaliacao         TO perfil_gestor;
GRANT SELECT ON ecoviagem.log_auditoria     TO perfil_gestor;

-- TURISTA (e a API): lê o catálogo e as views; gerencia as próprias viagens ----
GRANT SELECT ON ecoviagem.destino                 TO perfil_turista;
GRANT SELECT ON ecoviagem.hospedagem              TO perfil_turista;
GRANT SELECT ON ecoviagem.hospedagem_certificacao TO perfil_turista;
GRANT SELECT ON ecoviagem.hospedagem_pratica      TO perfil_turista;
GRANT SELECT ON ecoviagem.atividade               TO perfil_turista;
GRANT SELECT ON ecoviagem.categoria_destino       TO perfil_turista;
GRANT SELECT ON ecoviagem.tipo_hospedagem         TO perfil_turista;
GRANT SELECT ON ecoviagem.certificacao_ambiental  TO perfil_turista;
GRANT SELECT ON ecoviagem.categoria_atividade     TO perfil_turista;
GRANT SELECT ON ecoviagem.pratica_sustentavel     TO perfil_turista;
GRANT SELECT ON ecoviagem.tipo_transporte         TO perfil_turista;
GRANT SELECT ON ecoviagem.vw_pegada_carbono_viagem         TO perfil_turista;
GRANT SELECT ON ecoviagem.vw_avaliacoes_destino            TO perfil_turista;
GRANT SELECT ON ecoviagem.vw_hospedagens_certificadas      TO perfil_turista;
GRANT SELECT ON ecoviagem.vw_indice_sustentabilidade_destino TO perfil_turista;
GRANT SELECT ON ecoviagem.vw_ocupacao_destino              TO perfil_turista;
GRANT SELECT ON ecoviagem.vw_reservas_usuario              TO perfil_turista;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.viagem            TO perfil_turista;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.reserva           TO perfil_turista;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.trecho_transporte TO perfil_turista;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.viagem_atividade  TO perfil_turista;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.avaliacao         TO perfil_turista;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecoviagem.usuario           TO perfil_turista;
-- Executar a função de pegada e a procedure de registro de viagem
GRANT EXECUTE ON FUNCTION  ecoviagem.fn_pegada_total_viagem TO perfil_turista;
GRANT EXECUTE ON PROCEDURE ecoviagem.sp_registrar_viagem    TO perfil_turista;

-- -----------------------------------------------------------------------------
-- 4) EXEMPLOS DE REVOKE (revogação de privilégio)
--    O turista NÃO pode apagar usuários; o gestor NÃO pode apagar certificações.
-- -----------------------------------------------------------------------------
REVOKE DELETE ON ecoviagem.usuario              FROM perfil_turista;
REVOKE DELETE ON ecoviagem.certificacao_ambiental FROM perfil_gestor;

FLUSH PRIVILEGES;
