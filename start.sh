#!/data/data/com.termux/files/usr/bin/bash
# Inicia o Termux IDE (mantém o Termux acordado em segundo plano)
cd "$(dirname "$0")"
termux-wake-lock 2>/dev/null
exec node server.js
