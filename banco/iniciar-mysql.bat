@echo off
REM ===========================================================================
REM  Inicia o MySQL 8.4 do projeto Corpus (porta 3307).
REM
REM  Existe porque o MySQL nao ficou registrado como servico do Windows: o
REM  comando --install exige terminal de administrador. Enquanto o servico nao
REM  for registrado, use este atalho para subir o banco.
REM
REM  Para tornar permanente (uma unica vez, PowerShell COMO ADMINISTRADOR):
REM     & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --install MySQL84 --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"
REM     net start MySQL84
REM ===========================================================================

echo Iniciando MySQL 8.4 na porta 3307...

tasklist /FI "IMAGENAME eq mysqld.exe" | find /I "mysqld.exe" >nul
if not errorlevel 1 (
    echo Ja existe um mysqld em execucao. Verifique se e o da porta 3307.
)

start "" /B "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"

echo Aguardando o servidor aceitar conexoes...
timeout /t 12 /nobreak >nul

"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -pcorpus_tg_2026 --port=3307 --protocol=TCP -e "SELECT VERSION() AS versao, @@port AS porta;" 2>nul
if errorlevel 1 (
    echo.
    echo FALHOU. Verifique o log em:
    echo   C:\ProgramData\MySQL\MySQL Server 8.4\Data\*.err
) else (
    echo.
    echo MySQL pronto. Agora suba a API:  cd api ^&^& npm start
)
pause
