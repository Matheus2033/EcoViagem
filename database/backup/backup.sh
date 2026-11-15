#!/usr/bin/env bash
# =============================================================================
# EcoViagem - Rotina de BACKUP do banco (parte do Plano de Administração)
# Gera um dump SQL com data/hora e remove backups com mais de 7 dias.
# Uso: ./backup.sh            (lê variáveis do ambiente ou usa os padrões)
# =============================================================================
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-ecoviagem_db}"
DB_NAME="${MYSQL_DATABASE:-ecoviagem}"
DB_USER="${MYSQL_USER:-root}"
DB_PASS="${MYSQL_ROOT_PASSWORD:-root}"
DEST_DIR="${DEST_DIR:-$(dirname "$0")/dumps}"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="${DEST_DIR}/ecoviagem_${STAMP}.sql"

mkdir -p "${DEST_DIR}"

echo ">> Gerando backup em ${FILE}"
# --routines e --triggers incluem procedures/functions e triggers no dump
docker exec "${DB_CONTAINER}" mysqldump -u"${DB_USER}" -p"${DB_PASS}" \
    --routines --triggers --single-transaction --databases "${DB_NAME}" > "${FILE}"

echo ">> Removendo backups com mais de 7 dias"
find "${DEST_DIR}" -name 'ecoviagem_*.sql' -mtime +7 -delete

echo ">> Backup concluído."
