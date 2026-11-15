#!/usr/bin/env bash
# =============================================================================
# EcoViagem - Rotina de RESTAURAÇÃO (recuperação de desastres) - MySQL
# Uso: ./restore.sh caminho/para/arquivo.sql
# =============================================================================
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: $0 <arquivo.sql>"; exit 1
fi

DUMP_FILE="$1"
DB_CONTAINER="${DB_CONTAINER:-ecoviagem_db}"
DB_USER="${MYSQL_USER:-root}"
DB_PASS="${MYSQL_ROOT_PASSWORD:-root}"

echo ">> Restaurando ${DUMP_FILE}"
# O dump foi gerado com --databases, então já recria o schema ecoviagem
cat "${DUMP_FILE}" | docker exec -i "${DB_CONTAINER}" mysql -u"${DB_USER}" -p"${DB_PASS}"

echo ">> Restauração concluída."
