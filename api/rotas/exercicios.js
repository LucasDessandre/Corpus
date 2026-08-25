/* ==========================================================================
   rotas/exercicios.js
   --------------------------------------------------------------------------
   GET /api/exercicios          → lista completa (atende RF 03)
   GET /api/exercicios?grupo=x  → filtra por grupo muscular (atende RF 04)
   GET /api/exercicios/:id      → um exercício específico (atende RF 05 e RF 06)

   OBSERVAÇÃO IMPORTANTE SOBRE O MODELO DE DADOS
   ---------------------------------------------
   A tabela `exercicio` guarda as orientações em dois campos TEXT:
   `instrucoes_tecnicas` e `alertas_seguranca`. Já a tela da Biblioteca
   renderiza listas (passo 1, passo 2, ...) e distingue alerta comum de
   alerta crítico.

   A convenção adotada para fazer a ponte, sem alterar o modelo entregue:

     • Cada linha do TEXT vira um item da lista (quebra por \n).
     • Um alerta que comece com "CRÍTICO:" é marcado como crítico.

   Assim o mesmo campo serve ao banco e ao front-end. Se preferir uma
   modelagem mais formal, o arquivo `migracao_opcional.sql` na pasta `api`
   cria colunas dedicadas — veja o README.
   ========================================================================== */

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

/* --------------------------------------------------------------------------
   Converte um campo TEXT em array, uma linha por item.
   Remove linhas vazias e espaços sobrando.
   -------------------------------------------------------------------------- */
function textoParaLista(texto) {
  if (!texto) return [];
  return String(texto)
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    /* aceita listas escritas com "-" ou "•" no começo da linha */
    .map((linha) => linha.replace(/^[-•*]\s*/, ''))
    .filter((linha) => linha.length > 0);
}

/* --------------------------------------------------------------------------
   Monta a lista de alertas, marcando os críticos.
   -------------------------------------------------------------------------- */
function montarAlertas(texto) {
  return textoParaLista(texto).map((linha) => {
    const critico = /^cr[íi]tico\s*:/i.test(linha);
    return {
      critico,
      /* remove o prefixo "CRÍTICO:" do texto exibido — a marcação já é o campo */
      texto: linha.replace(/^cr[íi]tico\s*:\s*/i, '')
    };
  });
}

/* --------------------------------------------------------------------------
   Traduz uma linha do banco no formato que a tela da Biblioteca consome.
   Manter esta função isolada facilita mudar o contrato depois sem mexer no SQL.
   -------------------------------------------------------------------------- */
function formatarExercicio(linha) {
  return {
    id:          linha.id_exercicio,
    nome:        linha.nome,

    /* Chave usada nos filtros: minúscula e sem acento ("bracos", "core") */
    grupo:       linha.grupo_slug,
    /* Rótulo exibido na interface ("Braços") */
    grupoLabel:  linha.grupo_nome,
    idGrupo:     linha.id_grupo_muscular,

    videoUrl:    linha.url_video,

    /* Orientações técnicas escritas (RF 06) */
    passos:      textoParaLista(linha.instrucoes_tecnicas),
    alertas:     montarAlertas(linha.alertas_seguranca),

    /* Campos que o protótipo usa mas que o modelo atual ainda não guarda.
       Ficam com valor padrão para a tela não quebrar. Veja o README. */
    dificuldade: 'iniciante',
    equipamento: '',
    secundario:  [],
    dicas:       [],
    youtubeId:   ''
  };
}

/* ==========================================================================
   GET /api/exercicios
   Query strings aceitas:
     ?grupo=peito     filtra pelo grupo muscular (RF 04)
     ?busca=supino    busca por nome
   ========================================================================== */
router.get('/', async (req, res, next) => {
  try {
    const { grupo, busca } = req.query;

    /* O JOIN traz o nome do grupo muscular junto do exercício, evitando que o
       front-end precise fazer uma segunda requisição para descobrir o nome.

       LOWER + REPLACE geram o "slug" do grupo (peito, costas, bracos...) que
       o front-end usa como chave de filtro. Fazer isso no SQL mantém a regra
       num lugar só. */
    let sql = `
      SELECT
        e.id_exercicio,
        e.nome,
        e.url_video,
        e.instrucoes_tecnicas,
        e.alertas_seguranca,
        e.id_grupo_muscular,
        g.nome AS grupo_nome,
        LOWER(
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            g.nome, 'ç','c'), 'á','a'), 'ã','a'), 'é','e'), 'í','i'), 'ô','o')
        ) AS grupo_slug
      FROM exercicio AS e
      INNER JOIN grupo_muscular AS g
        ON g.id_grupo_muscular = e.id_grupo_muscular
      WHERE 1 = 1
    `;

    /* Os valores NUNCA são concatenados na string do SQL. Eles entram como
       placeholders (?) e o mysql2 os envia separados do comando — é isso que
       impede SQL Injection. Concatenar aqui seria a falha clássica:
           WHERE nome = '${busca}'    ← NÃO faça isso
    */
    const parametros = [];

    if (grupo && grupo !== 'todos') {
      sql += `
        AND LOWER(
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            g.nome, 'ç','c'), 'á','a'), 'ã','a'), 'é','e'), 'í','i'), 'ô','o')
        ) = ?`;
      parametros.push(String(grupo).toLowerCase());
    }

    if (busca) {
      sql += ' AND e.nome LIKE ?';
      parametros.push(`%${busca}%`);
    }

    sql += ' ORDER BY g.nome, e.nome';

    /* `pool.query` devolve [linhas, metadados]. Só as linhas interessam. */
    const [linhas] = await pool.query(sql, parametros);

    const exercicios = linhas.map(formatarExercicio);

    res.json({
      total: exercicios.length,
      filtro: { grupo: grupo || 'todos', busca: busca || null },
      exercicios
    });

  } catch (erro) {
    /* Repassa para o tratador central de erros do server.js */
    next(erro);
  }
});

/* ==========================================================================
   GET /api/exercicios/grupos
   Lista os grupos musculares com a contagem de exercícios de cada um.
   Alimenta as pílulas de filtro e o "contador de exercícios encontrados"
   exigido pelo RF 04.

   Precisa vir ANTES da rota /:id — senão o Express entenderia "grupos"
   como um id e tentaria buscar o exercício de id "grupos".
   ========================================================================== */
router.get('/grupos', async (req, res, next) => {
  try {
    const [linhas] = await pool.query(`
      SELECT
        g.id_grupo_muscular,
        g.nome,
        COUNT(e.id_exercicio) AS total
      FROM grupo_muscular AS g
      LEFT JOIN exercicio AS e
        ON e.id_grupo_muscular = g.id_grupo_muscular
      GROUP BY g.id_grupo_muscular, g.nome
      ORDER BY g.nome
    `);

    res.json({
      total: linhas.length,
      grupos: linhas.map((l) => ({
        id:    l.id_grupo_muscular,
        nome:  l.nome,
        total: Number(l.total)
      }))
    });

  } catch (erro) {
    next(erro);
  }
});

/* ==========================================================================
   GET /api/exercicios/:id
   Um exercício específico, para a ficha de detalhe (RF 05 e RF 06).
   ========================================================================== */
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    /* Validação antes de ir ao banco: evita uma consulta inútil */
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: 'O id do exercício deve ser um número inteiro positivo.' });
    }

    const [linhas] = await pool.query(`
      SELECT
        e.id_exercicio,
        e.nome,
        e.url_video,
        e.instrucoes_tecnicas,
        e.alertas_seguranca,
        e.id_grupo_muscular,
        g.nome AS grupo_nome,
        LOWER(
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            g.nome, 'ç','c'), 'á','a'), 'ã','a'), 'é','e'), 'í','i'), 'ô','o')
        ) AS grupo_slug
      FROM exercicio AS e
      INNER JOIN grupo_muscular AS g
        ON g.id_grupo_muscular = e.id_grupo_muscular
      WHERE e.id_exercicio = ?
    `, [id]);

    if (linhas.length === 0) {
      return res.status(404).json({ erro: 'Exercício não encontrado.' });
    }

    res.json({ exercicio: formatarExercicio(linhas[0]) });

  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
