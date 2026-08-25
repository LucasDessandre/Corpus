@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Corpus - Instalacao

echo.
echo  ===============================================================
echo   CORPUS - Instalacao em maquina nova
echo  ===============================================================
echo.
echo  Antes de continuar, voce precisa ter instalado:
echo    1. Node.js .... https://nodejs.org  (versao LTS)
echo    2. MySQL ...... https://dev.mysql.com/downloads/installer/
echo.
echo  Se ja instalou os dois, pressione qualquer tecla.
pause >nul
echo.

REM ---------------------------------------------------------------- Node
echo  [1/5] Procurando o Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo  ERRO: Node.js nao encontrado.
    echo  Instale em https://nodejs.org e ABRA ESTE ARQUIVO DE NOVO.
    echo  ^(o Windows so reconhece o Node em janelas abertas depois da instalacao^)
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node --version') do echo        Node %%v encontrado.

REM ---------------------------------------------------------------- MySQL
echo.
echo  [2/5] Procurando o MySQL...
set "MYSQL_EXE="
where mysql >nul 2>nul && set "MYSQL_EXE=mysql"
if not defined MYSQL_EXE (
    for /d %%d in ("C:\Program Files\MySQL\MySQL Server*") do (
        if exist "%%d\bin\mysql.exe" set "MYSQL_EXE=%%d\bin\mysql.exe"
    )
)
if not defined MYSQL_EXE (
    if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"
)
if not defined MYSQL_EXE (
    echo.
    echo  ERRO: MySQL nao encontrado.
    echo  Instale o MySQL Community Server e abra este arquivo de novo.
    echo.
    pause
    exit /b 1
)
echo        Encontrado: !MYSQL_EXE!

REM ---------------------------------------------------------------- dados
echo.
echo  [3/5] Dados de conexao com o MySQL desta maquina
echo.
set /p DBPORT=  Porta [3306]: 
if "!DBPORT!"=="" set DBPORT=3306
set /p DBUSER=  Usuario [root]: 
if "!DBUSER!"=="" set DBUSER=root
set /p DBPASS=  Senha (deixe vazio se nao tiver): 

REM ---------------------------------------------------------------- banco
echo.
echo  [4/5] Criando o banco de dados...
if "!DBPASS!"=="" (
    "!MYSQL_EXE!" -u !DBUSER! --port=!DBPORT! --protocol=TCP --default-character-set=utf8mb4 < "banco\db_treino_seguro.sql"
) else (
    "!MYSQL_EXE!" -u !DBUSER! -p!DBPASS! --port=!DBPORT! --protocol=TCP --default-character-set=utf8mb4 < "banco\db_treino_seguro.sql"
)
if errorlevel 1 (
    echo.
    echo  ERRO ao criar o banco. Verifique se o MySQL esta rodando
    echo  e se a porta, o usuario e a senha estao corretos.
    echo.
    pause
    exit /b 1
)
echo        Banco db_treino_seguro criado com as 9 tabelas.

REM --------------------------------------------------------- .env + npm
echo.
echo  [5/5] Configurando o servidor...
(
echo PORT=3000
echo DB_HOST=localhost
echo DB_PORT=!DBPORT!
echo DB_USER=!DBUSER!
echo DB_PASSWORD=!DBPASS!
echo DB_NAME=db_treino_seguro
echo CORS_ORIGINS=http://localhost:3000
echo BCRYPT_ROUNDS=10
) > "api\.env"
echo        Arquivo api\.env criado.

pushd api
call npm install --no-fund --no-audit
popd

REM ------------------------------------------------------------- atalhos
echo.
echo  Criando o atalho na area de trabalho...
powershell -NoProfile -Command ^
  "$s=New-Object -ComObject WScript.Shell;" ^
  "$l=$s.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Corpus.lnk');" ^
  "$l.TargetPath='wscript.exe';" ^
  "$l.Arguments='\"%CD%\Corpus - abrir.vbs\"';" ^
  "$l.WorkingDirectory='%CD%';" ^
  "$l.IconLocation='shell32.dll,14';" ^
  "$l.Save();" ^
  "$l2=$s.CreateShortcut([Environment]::GetFolderPath('Startup')+'\Corpus - servidor.lnk');" ^
  "$l2.TargetPath='wscript.exe';" ^
  "$l2.Arguments='\"%CD%\Corpus - iniciar.vbs\"';" ^
  "$l2.WorkingDirectory='%CD%';" ^
  "$l2.Save()"

echo.
echo  ===============================================================
echo   PRONTO
echo  ===============================================================
echo.
echo   Use o icone "Corpus" na area de trabalho.
echo   O sistema tambem sobe sozinho quando voce ligar o computador.
echo.
pause
