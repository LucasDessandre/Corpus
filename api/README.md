# API REST — Corpus

Ponte entre o front-end (HTML/CSS/JS na pasta `Corpus/`) e o banco MySQL
`db_treino_seguro`.

**Stack:** Node.js + Express + mysql2 + cors + bcryptjs + dotenv

---

## Instalação

Pré-requisitos: **Node.js 18+** e **MySQL 8.0.16+** rodando.

> Nesta máquina o MySQL 8.4.9 está na **porta 3307**, e não na 3306 — o XAMPP
> já ocupa a 3306 com o MariaDB que hospeda os bancos das outras matérias.
> Os dois convivem ligados ao mesmo tempo. Detalhes em `banco/LEIA-ME-mysql.md`.

```bash
cd "TG - Copia/api"
npm install
```

Crie o arquivo de ambiente e preencha a senha do seu MySQL:

```bash
copy .env.example .env
```

Se ainda não criou o banco:

```bash
mysql -u root -p --port=3307 < ../banco/db_treino_seguro.sql
```

Suba a API:

```bash
npm start
```

Confirme que subiu abrindo <http://localhost:3000/api/health> — deve responder
`{"status":"ok", ...}`. Se acusar erro de conexão, revise o `.env`.

---

## Estrutura

```
api/
├── server.js               Express, middlewares, montagem das rotas
├── db.js                   Pool de conexões MySQL
├── rotas/
│   ├── exercicios.js       Biblioteca de exercícios
│   ├── usuarios.js         Cadastro e login
│   └── cargas.js           Registro de carga e histórico
├── exemplo-integracao.js   Exemplos de fetch() para o front-end
├── migracao_opcional.sql   Colunas extras (ver "Limitação conhecida")
└── .env                    Suas credenciais (não versionado)
```

---

## Endpoints

| Método | Rota | RF | O que faz |
|---|---|---|---|
| GET | `/api/health` | — | Diz se a API e o banco estão no ar |
| GET | `/api/exercicios` | RF 03 | Lista os exercícios com o grupo muscular via JOIN |
| GET | `/api/exercicios?grupo=peito` | RF 04 | Filtra por grupo muscular |
| GET | `/api/exercicios?busca=supino` | RF 04 | Busca por nome |
| GET | `/api/exercicios/grupos` | RF 04 | Grupos com a contagem de exercícios |
| GET | `/api/exercicios/:id` | RF 05, 06 | Um exercício, para a ficha de detalhe |
| POST | `/api/usuarios/cadastro` | RF 01 | Cria usuário com senha hasheada |
| POST | `/api/usuarios/login` | RF 02 | Autentica |
| POST | `/api/treinos/carga` | RF 10 | Grava a carga e devolve o alerta de progressão |
| GET | `/api/treinos/carga/:idUsuario` | RF 11 | Histórico de cargas |

### Códigos de resposta

| Código | Quando |
|---|---|
| 200 | Sucesso |
| 201 | Recurso criado (cadastro, registro de carga) |
| 400 | Dados inválidos — o corpo traz `detalhes` com a lista de erros |
| 401 | E-mail ou senha incorretos (Msg2) |
| 404 | Recurso ou rota inexistente |
| 409 | E-mail já cadastrado (Msg1) |
| 500 | Erro inesperado no servidor |

---

## Exemplos rápidos

```bash
# Listar exercícios
curl http://localhost:3000/api/exercicios

# Filtrar por grupo
curl "http://localhost:3000/api/exercicios?grupo=peito"

# Cadastrar usuário
curl -X POST http://localhost:3000/api/usuarios/cadastro \
  -H "Content-Type: application/json" \
  -d "{\"nome_usuario\":\"Lucas\",\"email\":\"lucas@teste.com\",\"senha\":\"senha123\",\"nivel_experiencia\":\"Iniciante\"}"

# Registrar carga
curl -X POST http://localhost:3000/api/treinos/carga \
  -H "Content-Type: application/json" \
  -d "{\"id_usuario\":1,\"id_exercicio\":1,\"carga_utilizada\":42.5}"
```

Para consumir a partir do front-end, veja `exemplo-integracao.js`.

---

## Decisões que valem explicar na defesa

**Senha com bcrypt.** A senha nunca é gravada em texto puro. O bcrypt gera um
hash de mão única com salt aleatório: dá para verificar se a senha confere, mas
não dá para recuperar a original, e duas pessoas com a mesma senha geram hashes
diferentes. É o que atende o RNF 03 ("criptografia de senhas") e o motivo de a
coluna `senha` ser `VARCHAR(255)`.

**Consultas parametrizadas.** Todo valor vindo do cliente entra como `?` e é
enviado separado do comando SQL. Isso é o que impede SQL Injection —
concatenar o valor direto na string do SQL seria a falha clássica.

**Pool de conexões.** Uma conexão única cai por timeout e atende um comando por
vez. O pool mantém até 10 conexões prontas, o que sustenta o RNF 02 (vários
acessos simultâneos sem perda de desempenho).

**Alerta de progressão no próprio POST.** Como o RF 10 exige comparar a carga
nova com o histórico, o endpoint faz o SELECT do registro anterior *antes* do
INSERT e devolve o alerta já pronto. O front-end só exibe, sem uma segunda
requisição no meio do treino.

**Mensagem de login genérica.** O erro é sempre "E-mail ou senha incorretos",
nunca "este e-mail não existe" — a segunda forma entregaria a lista de quem
está cadastrado.

---

## Limitação conhecida: o modelo não cobre a tela inteira

A tela da Biblioteca exibe quatro informações que a tabela `exercicio` **não
guarda**: nível de dificuldade, equipamento, músculos secundários e dicas.

Enquanto isso não for resolvido, a API devolve esses campos com valor padrão
(`dificuldade: 'iniciante'`, `equipamento: ''`, `secundario: []`, `dicas: []`),
e a tela perde as etiquetas de nível, o filtro por dificuldade e a aba de dicas.

Duas saídas:

1. **Rodar `migracao_opcional.sql`**, que cria as colunas e a tabela associativa
   de músculos secundários. Se escolher esta, atualize também a Tabela 17
   (Dicionário de Dados — Exercícios) na documentação do TG.
2. **Assumir a limitação** e deixar a Biblioteca com os dados fixos no
   `biblioteca.js` para a apresentação, usando a API só nas outras telas.

Há ainda uma convenção em uso: `instrucoes_tecnicas` e `alertas_seguranca` são
campos `TEXT` únicos, mas a tela mostra listas. A API quebra o texto por linha,
e trata como alerta crítico toda linha iniciada por `CRÍTICO:`. Ao popular a
tabela, escreva **um passo por linha**.
