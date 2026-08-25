/* ==========================================================================
   server.js — Ponto de entrada da API do Corpus
   --------------------------------------------------------------------------
   Responsabilidades deste arquivo:

     1. Criar a aplicação Express
     2. Registrar os middlewares (CORS, leitura de JSON, log das requisições)
     3. Montar as rotas
     4. Tratar rotas inexistentes (404) e erros não previstos (500)
     5. Subir o servidor, testando antes se o banco responde

   Um middleware é uma função que roda ANTES das rotas e pode alterar `req`,
   alterar `res` ou passar adiante chamando `next()`. A ordem em que são
   registrados importa: eles executam de cima para baixo.
   ========================================================================== */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { testarConexao } = require('./db');

const rotasExercicios = require('./rotas/exercicios');
const rotasUsuarios   = require('./rotas/usuarios');
const rotasCargas     = require('./rotas/cargas');

const app  = express();
const PORT = Number(process.env.PORT) || 3000;

/* ==========================================================================
   1. MIDDLEWARES
   ========================================================================== */

/* -- CORS --------------------------------------------------------------------
   O navegador bloqueia, por padrão, requisições entre origens diferentes
   (a "same-origin policy"). Como o front-end roda em http://localhost:8765 e
   a API em http://localhost:3000, são origens distintas: sem CORS o navegador
   recusa a resposta e o fetch falha.

   A lista de origens permitidas vem do .env. Evite `origin: '*'` em produção —
   liberar geral significa que qualquer site poderia consumir a sua API.
   -------------------------------------------------------------------------- */
const origensPermitidas = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/* A própria API serve o site (ver seção 2b), então o navegador manda
   Origin: http://localhost:3000. Essa origem entra na lista automaticamente —
   sem isto, abrir o site pelo endereço da API resultaria em erro de CORS. */
if (origensPermitidas.length > 0) {
  origensPermitidas.push(`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`);
}

app.use(cors({
  origin(origin, callback) {
    /* `origin` vem indefinido em requisições sem navegador (Insomnia, curl,
       ou o próprio arquivo aberto via file://) — essas são liberadas. */
    if (!origin) return callback(null, true);

    /* Lista vazia no .env = libera tudo (apenas para desenvolvimento) */
    if (origensPermitidas.length === 0) return callback(null, true);

    if (origensPermitidas.includes(origin)) return callback(null, true);

    return callback(new Error(`Origem não autorizada pelo CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/* -- Leitura do corpo da requisição ------------------------------------------
   Sem isto, `req.body` chega como `undefined` nos POSTs. O limite de 1mb
   evita que alguém envie um corpo gigante para derrubar o servidor.
   -------------------------------------------------------------------------- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* -- Log simples das requisições ---------------------------------------------
   Ajuda muito a depurar durante o desenvolvimento: mostra método, caminho,
   código de resposta e quanto tempo cada requisição levou.
   -------------------------------------------------------------------------- */
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - inicio;
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

/* ==========================================================================
   2. ROTAS
   ========================================================================== */

/* Rota de saúde: confirma que a API está no ar e que o banco responde.
   Útil para testar a instalação antes de mexer no front-end. */
app.get('/api/health', async (req, res, next) => {
  try {
    const banco = await testarConexao();
    res.json({ status: 'ok', api: 'online', banco });
  } catch (erro) {
    next(erro);
  }
});

app.use('/api/exercicios', rotasExercicios);
app.use('/api/usuarios',   rotasUsuarios);
app.use('/api/treinos',    rotasCargas);

/* ==========================================================================
   2b. O SITE
   --------------------------------------------------------------------------
   A API também entrega os arquivos do front-end (pasta Corpus). Duas vantagens:

     1. Um endereço só. Abrir http://localhost:3000 traz o site inteiro, sem
        precisar de um segundo servidor para os HTML.
     2. Some o CORS. Site e API passam a ter a MESMA origem, então o navegador
        não bloqueia nada — é o mesmo servidor respondendo os dois.

   Vem depois das rotas /api de propósito: assim uma URL que comece com /api
   nunca é confundida com um arquivo.
   ========================================================================== */
const path = require('path');
const PASTA_SITE = path.join(__dirname, '..', 'Corpus');

app.use(express.static(PASTA_SITE, {
  extensions: ['html'],       /* /login funciona igual a /login.html */
  index: 'login.html'         /* a raiz abre a tela de login */
}));

/* ==========================================================================
   3. ROTA NÃO ENCONTRADA (404)
   Registrada DEPOIS de todas as rotas: só chega aqui o que nenhuma atendeu.
   ========================================================================== */
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    caminho: req.originalUrl,
    dica: 'Confira o método (GET/POST) e o caminho. Veja GET /api/health.'
  });
});

/* ==========================================================================
   4. TRATAMENTO DE ERROS
   --------------------------------------------------------------------------
   Um middleware com QUATRO parâmetros (erro, req, res, next) é reconhecido
   pelo Express como tratador de erros. Todo `next(erro)` das rotas cai aqui,
   o que evita repetir o mesmo bloco de resposta em cada endpoint.

   A mensagem técnica só é enviada fora de produção: em produção, detalhes
   internos (nome de tabela, SQL) não devem vazar para o cliente.
   ========================================================================== */
app.use((erro, req, res, next) => {
  console.error('[ERRO]', erro);

  const emProducao = process.env.NODE_ENV === 'production';

  /* Bloqueio de CORS não é falha do servidor: é configuração. Devolver 500
     aqui esconderia a causa real — o desenvolvedor procuraria o erro no banco
     ou na rota, quando o problema está na lista CORS_ORIGINS do .env. */
  if (/CORS/i.test(erro.message || '')) {
    return res.status(403).json({
      erro: erro.message,
      dica: 'Acrescente esta origem em CORS_ORIGINS, no arquivo api/.env.'
    });
  }

  res.status(erro.status || 500).json({
    erro: 'Erro interno no servidor',
    mensagem: emProducao ? undefined : erro.message
  });
});

/* ==========================================================================
   5. SUBIDA DO SERVIDOR
   ========================================================================== */
async function iniciar() {
  try {
    const banco = await testarConexao();
    console.log(`✅ MySQL conectado — banco "${banco.banco}" em ${banco.host}`);
  } catch (erro) {
    /* Não derruba o processo: a API sobe mesmo assim e o /api/health mostra o
       problema. Assim você consegue testar as rotas e ver a mensagem de erro
       em vez de ficar com o terminal fechando sozinho. */
    console.error('⚠️  Não foi possível conectar ao MySQL:', erro.message);
    console.error('    Verifique se o MySQL está rodando e se o .env está correto.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Corpus no ar — abra http://localhost:${PORT}`);
    console.log(`   Site .......: http://localhost:${PORT}`);
    console.log(`   API ........: http://localhost:${PORT}/api/health`);
  });
}

iniciar();
