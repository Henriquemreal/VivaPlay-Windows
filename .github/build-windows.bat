@echo off
setlocal
title VivaPlay - Gerar instalador Windows
echo ========================================
echo       VivaPlay - Build para Windows
echo ========================================
where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado.
  echo Instale o Node.js LTS em https://nodejs.org/ e execute novamente.
  pause
  exit /b 1
)
echo.
echo Instalando dependencias do projeto...
call npm install
if errorlevel 1 (
  echo ERRO ao instalar dependencias.
  pause
  exit /b 1
)
echo.
echo Gerando instalador Windows...
call npm run dist
if errorlevel 1 (
  echo ERRO ao gerar o instalador.
  pause
  exit /b 1
)
echo.
echo Concluido. Confira a pasta dist.
pause
