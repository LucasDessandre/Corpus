# MySQL 8.4 — como o banco do Corpus está montado

## Por que a porta 3307 e não a 3306

O XAMPP que você já tinha instalado **não usa MySQL, usa MariaDB 10.4** (um fork
do MySQL). E ele hospeda outros bancos das suas outras matérias:

```
carrinhos, catalogo_filmes, catalogo_musica_db, catalogo_musicas,
fateclogin, grauth_suplementos, login
```

Os dois servidores disputam a mesma porta padrão, a **3306**. Se o MySQL fosse
instalado ali, o XAMPP deixaria de subir e esses sete bancos ficariam
inacessíveis até você resolver o conflito.

Por isso o MySQL do Corpus roda na **3307**:

| Servidor | Porta | Para quê |
|---|---|---|
| MariaDB (XAMPP) | 3306 | Seus outros projetos, intocados |
| MySQL 8.4 | 3307 | Corpus (TG) |

Os dois podem ficar ligados ao mesmo tempo, sem conflito.

Se um dia quiser o MySQL na 3306 padrão, basta parar o MySQL do XAMPP pelo
painel de controle e trocar a porta em dois lugares: no `my.ini` do MySQL e no
`DB_PORT` do arquivo `api/.env`.

---

## Credenciais

```
host:  localhost
porta: 3307
user:  root
senha: corpus_tg_2026
banco: db_treino_seguro
```

A senha está no `api/.env`, que **não é versionado** (está no `.gitignore`).
Para um banco local de desenvolvimento isso é aceitável; num servidor real,
troque por uma senha forte e crie um usuário sem privilégios de root só para a
aplicação.

> **Por que o root do MySQL tem senha e o do XAMPP não?**
> O MySQL 8.4 removeu o plugin `mysql_native_password` do núcleo e usa
> `caching_sha2_password`, que não lida bem com senha vazia em conexões locais.
> Definir uma senha evita esse atrito — e é, de qualquer forma, a prática
> correta.

---

## Ligar e desligar

**MySQL (Corpus)** — instalado como serviço do Windows, sobe junto com o
computador:

```powershell
net start MySQL84      # ligar
net stop  MySQL84      # desligar
```

**MariaDB (outros projetos)** — pelo painel do XAMPP:

```
C:\xampp\xampp-control.exe
```

---

## Acessar pelo terminal

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p --port=3307 db_treino_seguro
```

---

## Recriar o banco do zero

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p --port=3307 < db_treino_seguro.sql
```

O script começa com `DROP DATABASE IF EXISTS`, então apaga e recria tudo.

---

## O que muda no TG escrito

Nada precisa mudar — pelo contrário, **agora o texto ficou correto**. A sua
documentação afirma MySQL na seção 2.2.2, no RNF 02 e no RNF 03, e é MySQL que
o sistema usa de fato. Antes, com o XAMPP, você estaria apresentando MariaDB
enquanto o documento dizia MySQL.

Se a banca perguntar sobre a porta 3307, a resposta é direta: a máquina de
desenvolvimento já tinha outro SGBD ocupando a 3306, e a porta é configurável
pelo arquivo de ambiente da aplicação.
