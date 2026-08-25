/* ==========================================================================
   rotas/cargas.js
   --------------------------------------------------------------------------
   POST /api/treinos/carga                → registra a carga usada  (RF 10)
   GET  /api/treinos/carga/:idUsuario     → histórico do usuário    (RF 11)

   SOBRE O ALERTA DE PROGRESSÃO (RF 10)
   ------------------------------------
   O TG define que o sistema deve comparar a carga nova com o histórico e
   avisar quando o aumento for abrupto. Como essa comparação depende do
   registro anterior, ela é feita aqui, no mesmo endpoint que grava: a
   resposta devolve o campo `alerta` já preenchido, e o front-end só precisa
   exibir. Isso evita uma segunda requisição no meio do treino.

   O limite de 10% por semana é a referência mais citada na literatura de
   treinamento resistido para progressão segura. Está isolado na constante
   abaixo para ser fácil de ajustar conforme a fundamentação do trabalho.
   ========================================================================== */

const express  = require('express');
const router   = express.Router();
const { pool } = require('../db');

/* Acima deste percentual de aumento, o sistema emite alerta */
const LIMITE_AUMENTO_SEGURO = 10;   /* % */

/* Acima deste, o alerta é tratado como crítico */
const LIMITE_AUMENTO_CRITICO = 20;  /* % */

/* --------------------------------------------------------------------------
   Compara a carga nova com a anterior e devolve o alerta correspondente.
   -------------------------------------------------------------------------- */
function avaliarProgressao(cargaAnterior, cargaNova) {
  /* Primeiro registro do exercício: não há com o que comparar */
  if (cargaAnterior === null || cargaAnterior === undefined) {
    return {
      nivel: 'info',
      variacao: null,
      mensagem: 'Primeiro registro para este exercício. Ele servirá de base para as próximas comparações.'
    };
  }

  /* Evita divisão por zero em exercícios registrados com carga 0
     (peso do corpo, por exemplo) */
  if (Number(cargaAnterior) === 0) {
    return {
      nivel: 'info',
      variacao: null,
      mensagem: 'Carga anterior registrada como zero — sem base percentual para comparar.'
    };
  }

  const variacao = ((cargaNova - cargaAnterior) / cargaAnterior) * 100;
  const arredondada = Math.round(variacao * 10) / 10;

  if (variacao > LIMITE_AUMENTO_CRITICO) {
    return {
      nivel: 'critico',
      variacao: arredondada,
      mensagem: `Aumento de ${arredondada}% em relação ao último registro. `
              + 'Saltos acima de 20% elevam bastante o risco de distensão e tendinopatia. '
              + 'Considere voltar para uma carga intermediária e progredir aos poucos.'
    };
  }

  if (variacao > LIMITE_AUMENTO_SEGURO) {
    return {
      nivel: 'atencao',
      variacao: arredondada,
      mensagem: `Aumento de ${arredondada}% em relação ao último registro. `
              + `Acima de ${LIMITE_AUMENTO_SEGURO}% por sessão a progressão deixa de ser gradual — `
              + 'fique atento a qualquer desconforto durante a execução.'
    };
  }

  if (variacao < 0) {
    return {
      nivel: 'ok',
      variacao: arredondada,
      mensagem: `Redução de ${Math.abs(arredondada)}%. Reduzir carga é uma decisão válida `
              + 'para recuperar técnica ou se recuperar de desconforto.'
    };
  }

  return {
    nivel: 'ok',
    variacao: arredondada,
    mensagem: arredondada === 0
      ? 'Carga mantida em relação ao último registro.'
      : `Aumento de ${arredondada}%, dentro da faixa considerada segura.`
  };
}

/* ==========================================================================
   POST /api/treinos/carga

   Corpo esperado (JSON):
   {
     "id_usuario": 1,
     "id_exercicio": 1,
     "carga_utilizada": 42.5
   }
   ========================================================================== */
router.post('/carga', async (req, res, next) => {
  try {
    const idUsuario   = Number(req.body.id_usuario);
    const idExercicio = Number(req.body.id_exercicio);
    const carga       = Number(req.body.carga_utilizada ?? req.body.carga);

    /* ---- Validações ---- */
    const erros = [];

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      erros.push('id_usuario deve ser um número inteiro positivo.');
    }
    if (!Number.isInteger(idExercicio) || idExercicio <= 0) {
      erros.push('id_exercicio deve ser um número inteiro positivo.');
    }
    if (!Number.isFinite(carga) || carga < 0) {
      erros.push('carga_utilizada deve ser um número maior ou igual a zero.');
    }
    if (carga > 1000) {
      erros.push('carga_utilizada acima de 1000 kg — verifique se o valor está correto.');
    }

    if (erros.length > 0) {
      return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });
    }

    /* ---- Busca o registro anterior ANTES de inserir o novo ----
       A ordem importa: se inserisse primeiro, o "anterior" retornado seria
       o próprio registro que acabou de entrar. */
    const [anteriores] = await pool.query(
      `SELECT carga_utilizada, data_registro
       FROM registro_carga
       WHERE id_usuario = ? AND id_exercicio = ?
       ORDER BY data_registro DESC, id_registro_carga DESC
       LIMIT 1`,
      [idUsuario, idExercicio]
    );

    const anterior = anteriores.length > 0 ? Number(anteriores[0].carga_utilizada) : null;

    /* ---- INSERT ----
       `data_registro` não é enviada: a coluna tem DEFAULT CURRENT_TIMESTAMP,
       então quem carimba a hora é o banco. Isso evita divergência caso o
       relógio do cliente esteja errado. */
    const [resultado] = await pool.query(
      `INSERT INTO registro_carga (carga_utilizada, id_usuario, id_exercicio)
       VALUES (?, ?, ?)`,
      [carga, idUsuario, idExercicio]
    );

    const alerta = avaliarProgressao(anterior, carga);

    return res.status(201).json({
      mensagem: 'Registro de carga concluído.',   /* Msg10 do TG */
      registro: {
        id_registro_carga: resultado.insertId,
        id_usuario:        idUsuario,
        id_exercicio:      idExercicio,
        carga_utilizada:   carga
      },
      carga_anterior: anterior,
      alerta
    });

  } catch (erro) {
    /* Chave estrangeira inválida: usuário ou exercício que não existe */
    if (erro.code === 'ER_NO_REFERENCED_ROW_2' || erro.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({
        erro: 'Usuário ou exercício inexistente. Verifique id_usuario e id_exercicio.'
      });
    }

    next(erro);
  }
});

/* ==========================================================================
   GET /api/treinos/carga/:idUsuario   (RF 11 — histórico de evolução)

   Query string opcional:
     ?id_exercicio=3   restringe a um exercício
     ?limite=50        quantos registros trazer (padrão 50, máximo 200)
   ========================================================================== */
router.get('/carga/:idUsuario', async (req, res, next) => {
  try {
    const idUsuario = Number(req.params.idUsuario);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({ erro: 'id_usuario deve ser um número inteiro positivo.' });
    }

    /* Teto no limite para uma requisição não conseguir puxar a tabela inteira */
    const limite = Math.min(Number(req.query.limite) || 50, 200);

    let sql = `
      SELECT
        rc.id_registro_carga,
        rc.carga_utilizada,
        rc.data_registro,
        rc.id_exercicio,
        e.nome AS exercicio_nome,
        g.nome AS grupo_nome
      FROM registro_carga AS rc
      INNER JOIN exercicio      AS e ON e.id_exercicio      = rc.id_exercicio
      INNER JOIN grupo_muscular AS g ON g.id_grupo_muscular = e.id_grupo_muscular
      WHERE rc.id_usuario = ?
    `;
    const parametros = [idUsuario];

    if (req.query.id_exercicio) {
      sql += ' AND rc.id_exercicio = ?';
      parametros.push(Number(req.query.id_exercicio));
    }

    sql += ' ORDER BY rc.data_registro DESC, rc.id_registro_carga DESC LIMIT ?';
    parametros.push(limite);

    const [linhas] = await pool.query(sql, parametros);

    res.json({
      total: linhas.length,
      id_usuario: idUsuario,
      registros: linhas.map((l) => ({
        id:          l.id_registro_carga,
        carga:       Number(l.carga_utilizada),
        data:        l.data_registro,
        idExercicio: l.id_exercicio,
        exercicio:   l.exercicio_nome,
        grupo:       l.grupo_nome
      }))
    });

  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
