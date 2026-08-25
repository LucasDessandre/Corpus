# Corpus — Treine certo, evolua sempre

Plataforma web de apoio a praticantes de musculação, com foco na **prevenção de
lesões**. Reúne biblioteca de exercícios com vídeo e orientações técnicas,
montagem de treino, registro de cargas com alerta de progressão abrupta e
acompanhamento da evolução.

Trabalho de Graduação — Tecnologia em Análise e Desenvolvimento de Sistemas
**Fatec Araçatuba**, 2026
Heitor Scavassa Barbosa · Lucas Grauth Dessandre
Orientação: Prof.ª Dr.ª Renata de Freitas Góis Comparoni

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5, CSS3 e JavaScript (sem frameworks) |
| Back-end | Node.js + Express |
| Banco de dados | MySQL 8.4 |
| Segurança | bcrypt para hash de senhas |

---

## Instalação em uma máquina nova

**Pré-requisitos** (instale os dois primeiro):

1. [Node.js](https://nodejs.org) — versão LTS
2. [MySQL Community Server](https://dev.mysql.com/downloads/installer/)

**Depois:**

1. Baixe este repositório (botão verde `Code` → `Download ZIP`, ou `git clone`)
2. Dê duplo clique em **`INSTALAR.bat`**
3. Informe a porta, o usuário e a senha do MySQL quando for perguntado

O instalador cria o banco com as 9 tabelas, instala as dependências, gera o
arquivo de configuração e coloca um atalho na área de trabalho.

---

## Uso no dia a dia

Duplo clique no ícone **Corpus** da área de trabalho — ou abra
<http://localhost:3000> no navegador.

O servidor sobe sozinho junto com o Windows. Não é preciso usar terminal.

---

## Estrutura

```
├── Corpus/          Front-end: telas, estilos, vídeos e miniaturas
├── api/             Servidor Node.js (Express) e rotas da API
├── banco/           Script SQL de criação do banco
├── INSTALAR.bat     Instalador para máquina nova
└── Corpus - abrir.vbs   O que o atalho da área de trabalho executa
```

O servidor entrega o site **e** a API no mesmo endereço, o que elimina
problemas de CORS e reduz tudo a um único processo.

---

## API

Documentação completa em [`api/README.md`](api/README.md).

| Método | Rota | Requisito |
|---|---|---|
| GET | `/api/exercicios` | RF 03 |
| GET | `/api/exercicios?grupo=peito` | RF 04 |
| POST | `/api/usuarios/cadastro` | RF 01 |
| POST | `/api/usuarios/login` | RF 02 |
| POST | `/api/treinos/carga` | RF 10 |
| GET | `/api/treinos/carga/:idUsuario` | RF 11 |

---

## Estado atual

| Requisito | Situação |
|---|---|
| RF 01 — Cadastro de usuário | completo (tela + API + banco) |
| RF 02 — Login | completo (tela + API + banco) |
| RF 03 — Biblioteca de exercícios | tela completa, dados no front-end |
| RF 04 — Filtragem por grupo muscular | completo |
| RF 05 — Vídeos de execução | completo, com arquivos locais |
| RF 06 — Orientações técnicas | completo |
| RF 10 — Registro de carga e feedback | API completa, falta ligar na tela |
| RF 11 — Histórico de evolução | API completa, falta ligar na tela |

### Limitações conhecidas

**A Biblioteca não consome a API.** A tela exibe nível de dificuldade,
equipamento, músculos secundários e dicas — quatro campos que a tabela
`exercicio` não armazena. Manteve-se assim para não alterar o dicionário de
dados documentado. O arquivo `api/migracao_opcional.sql` cria essas colunas
caso se decida mudar.

**O RF 05 usa arquivos locais, não YouTube.** Cada exercício em
`Corpus/biblioteca.js` possui um campo `youtubeId` vazio; ao preenchê-lo, o
player passa a usar o vídeo incorporado do YouTube automaticamente.

---

## Segurança

- Senhas nunca são gravadas em texto puro — apenas o hash bcrypt (60 caracteres)
- Todas as consultas SQL são parametrizadas, o que impede SQL Injection
- O arquivo `api/.env`, que contém a senha do banco, **não é versionado**
