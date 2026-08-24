@echo off
REM ============================================================
REM KING FOOD — WhatsApp QR Agent (Opcao A: processo persistente)
REM Roda o backend local com a sessao WhatsApp Web (QR) ativa.
REM O QR NAO funciona em serverless (Vercel) — precisa deste processo.
REM ============================================================
cd /d "%~dp0..\.."

echo [KingFood] Iniciando servidor WhatsApp QR...
echo [KingFood] Para conectar: abra o Admin em http://localhost:3000/admin
echo [KingFood] WhatsApp -> Conectar (QR aparece na tela)

REM Carrega .env antes dos imports (JWT_SECRET etc. exigidos no load)
node -r dotenv/config packages/server/dist/index.js
