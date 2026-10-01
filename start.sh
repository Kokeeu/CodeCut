#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$PROJECT_DIR/server"
CLIENT_DIR="$PROJECT_DIR/client"

if ! command -v npm >/dev/null 2>&1; then
  printf 'Necesitas instalar Node.js y npm para iniciar los proyectos.\n' >&2
  exit 1
fi

for project_dir in "$SERVER_DIR" "$CLIENT_DIR"; do
  if [[ ! -d "$project_dir/node_modules" ]]; then
    printf 'Faltan dependencias. Ejecuta: npm --prefix "%s" install\n' "$project_dir" >&2
    exit 1
  fi
done

server_pid=''
client_pid=''

cleanup() {
  trap - EXIT INT TERM
  printf '\nDeteniendo cliente y servidor…\n'
  for pid in "$server_pid" "$client_pid"; do
    if [[ -n "$pid" ]]; then
      kill -TERM -- "-$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

set -m

printf 'Iniciando servidor y cliente. Usa Ctrl+C para detener ambos.\n'
(cd "$SERVER_DIR" && exec npm start) &
server_pid=$!
(cd "$CLIENT_DIR" && exec npm run dev) &
client_pid=$!

while kill -0 "$server_pid" 2>/dev/null && kill -0 "$client_pid" 2>/dev/null; do
  sleep 1
done

exit_code=0
for pid in "$server_pid" "$client_pid"; do
  if ! kill -0 "$pid" 2>/dev/null; then
    wait "$pid" || exit_code=$?
  fi
done
exit "$exit_code"
