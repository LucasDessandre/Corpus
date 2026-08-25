/* ==========================================================================
   db.js — Conexão com o banco de dados MySQL
   --------------------------------------------------------------------------
   Usa o pacote `mysql2` na versão com Promises, que permite escrever
   `await conexao.query(...)` em vez de trabalhar com callbacks aninhados.

   Por que um POOL de conexões e não uma conexão única?

     Uma conexão única atende um comando por vez e cai se o MySQL encerrar a
     sessão por inatividade — a API pararia de funcionar até reiniciar. O pool
     mantém um conjunto de conexões prontas, empresta uma a cada requisição e
     a devolve ao final. Isso atende o RNF 02 (performance e vários acessos
     simultâneos sem perda de desempenho).
   ========================================================================== */

require('dotenv').config();
const mysql = require('mysql2/promise');

/* --------------------------------------------------------------------------
   Criação do pool
   -------------------------------------------------------------------------- */
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'db_treino_seguro',

  /* Espera liberar uma conexão em vez de estourar erro quando todas estão em uso */
  waitForConnections: true,

  /* Máximo de conexões simultâneas mantidas pelo pool */
  connectionLimit: 10,

  /* 0 = fila de espera ilimitada */
  queueLimit: 0,

  /* Acentuação correta em português (é, ã, ç) */
  charset: 'utf8mb4',

  /* Devolve DATETIME como string 'YYYY-MM-DD HH:mm:ss' em vez de objeto Date.
     Evita que o fuso horário do Node altere a data que veio do banco. */
  dateStrings: true
});

/* --------------------------------------------------------------------------
   Teste de conexão
   Chamado uma vez na subida do servidor. Falhar aqui, no start, é melhor que
   descobrir o problema só quando o primeiro usuário fizer uma requisição.
   -------------------------------------------------------------------------- */
async function testarConexao() {
  const conexao = await pool.getConnection();
  try {
    await conexao.ping();
    return {
      ok: true,
      banco: process.env.DB_NAME || 'db_treino_seguro',
      host:  process.env.DB_HOST || 'localhost'
    };
  } finally {
    /* `release` devolve a conexão ao pool. Sem isto o pool se esgota após
       10 requisições e a API trava. O `finally` garante a devolução mesmo
       que o ping lance erro. */
    conexao.release();
  }
}

module.exports = { pool, testarConexao };
