/* ==========================================================================
   rotas/usuarios.js
   --------------------------------------------------------------------------
   POST /api/usuarios/cadastro  → cria um usuário   (atende RF 01)
   POST /api/usuarios/login     → autentica         (atende RF 02)

   SOBRE A SENHA
   -------------
   A senha NUNCA é gravada como texto puro. Ela passa pelo bcrypt, que gera
   um hash de mão única: dá para verificar se uma senha confere, mas não dá
   para voltar do hash à senha original. Isso atende o RNF 03 do TG, que exige
   "criptografia de senhas", e é o motivo de a coluna `senha` ser VARCHAR(255)
   no modelo — o hash bcrypt ocupa 60 caracteres.

   O bcrypt também embute um "salt" aleatório em cada hash: dois usuários com
   a mesma senha geram hashes diferentes, o que impede descobrir senhas iguais
   comparando registros.
   ========================================================================== */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const { pool } = require('../db');

/* Valores aceitos pela restrição CHECK da coluna `nivel_experiencia`.
   Manter esta lista igual à do banco evita que o INSERT falhe. */
const NIVEIS_VALIDOS = ['Iniciante', 'Intermediário', 'Avançado'];

const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

/* Validação simples de e-mail. Não substitui a confirmação por link,
   mas barra os erros de digitação mais comuns. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ==========================================================================
   POST /api/usuarios/cadastro

   Corpo esperado (JSON):
   {
     "nome_usuario": "Lucas",
     "email": "lucas@email.com",
     "senha": "minhasenha123",
     "nivel_experiencia": "Iniciante"
   }
   ========================================================================== */
router.post('/cadastro', async (req, res, next) => {
  try {
    /* Aceita tanto os nomes das colunas do banco quanto os nomes curtos
       usados no formulário — evita erro bobo de integração. */
    const nome  = (req.body.nome_usuario ?? req.body.nome ?? '').trim();
    const email = (req.body.email ?? '').trim().toLowerCase();
    const senha = req.body.senha ?? '';
    const nivel = (req.body.nivel_experiencia ?? req.body.nivel ?? 'Iniciante').trim();

    /* ---- Validações (falhar cedo, com mensagem clara) ---- */
    const erros = [];

    if (!nome)  erros.push('O nome de usuário é obrigatório.');
    if (nome.length > 50) erros.push('O nome de usuário deve ter no máximo 50 caracteres.');

    if (!email) erros.push('O e-mail é obrigatório.');
    else if (!EMAIL_REGEX.test(email)) erros.push('O e-mail informado não é válido.');
    else if (email.length > 100) erros.push('O e-mail deve ter no máximo 100 caracteres.');

    if (!senha) erros.push('A senha é obrigatória.');
    else if (senha.length < 6) erros.push('A senha deve ter ao menos 6 caracteres.');

    if (!NIVEIS_VALIDOS.includes(nivel)) {
      erros.push(`O nível de experiência deve ser: ${NIVEIS_VALIDOS.join(', ')}.`);
    }

    if (erros.length > 0) {
      /* 400 Bad Request: o cliente mandou dados inválidos */
      return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });
    }

    /* ---- Verificação de e-mail já cadastrado (pré-condição do RF 01) ----
       O banco também tem UNIQUE em `email`, o que é a garantia real. Esta
       consulta serve para devolver uma mensagem amigável em vez de um erro
       cru de constraint. O tratamento do ER_DUP_ENTRY mais abaixo cobre a
       corrida entre dois cadastros simultâneos. */
    const [existentes] = await pool.query(
      'SELECT id_usuario FROM usuario WHERE email = ?',
      [email]
    );

    if (existentes.length > 0) {
      /* 409 Conflict — corresponde à Msg1 do TG:
         "E-mail já cadastrado no sistema." */
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado no sistema.' });
    }

    /* ---- Hash da senha ---- */
    const senhaHash = await bcrypt.hash(senha, ROUNDS);

    /* ---- INSERT ---- */
    const [resultado] = await pool.query(
      `INSERT INTO usuario (nome_usuario, email, senha, nivel_experiencia)
       VALUES (?, ?, ?, ?)`,
      [nome, email, senhaHash, nivel]
    );

    /* 201 Created + o recurso criado, SEM a senha.
       Devolver o hash não traz utilidade e amplia a superfície de vazamento. */
    return res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso.',
      usuario: {
        id_usuario:        resultado.insertId,
        nome_usuario:      nome,
        email,
        nivel_experiencia: nivel
      }
    });

  } catch (erro) {
    /* Rede de segurança: se dois cadastros com o mesmo e-mail chegarem ao
       mesmo tempo, os dois podem passar pelo SELECT acima, mas só um vence
       o UNIQUE do banco. O perdedor cai aqui. */
    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado no sistema.' });
    }

    /* Violação do CHECK de nivel_experiencia */
    if (erro.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      return res.status(400).json({
        erro: `Nível de experiência inválido. Use: ${NIVEIS_VALIDOS.join(', ')}.`
      });
    }

    next(erro);
  }
});

/* ==========================================================================
   POST /api/usuarios/login   (RF 02)

   Corpo esperado:
   { "email": "lucas@email.com", "senha": "minhasenha123" }
   ========================================================================== */
router.post('/login', async (req, res, next) => {
  try {
    const email = (req.body.email ?? '').trim().toLowerCase();
    const senha = req.body.senha ?? '';

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Informe e-mail e senha.' });
    }

    const [linhas] = await pool.query(
      `SELECT id_usuario, nome_usuario, email, senha, nivel_experiencia
       FROM usuario WHERE email = ?`,
      [email]
    );

    const usuario = linhas[0];

    /* Se o usuário não existe, ainda assim comparamos contra um hash falso.
       Isso faz o tempo de resposta ser parecido nos dois casos e evita que
       alguém descubra quais e-mails existem medindo a demora da resposta. */
    const hashParaComparar = usuario
      ? usuario.senha
      : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';

    const senhaConfere = await bcrypt.compare(senha, hashParaComparar);

    if (!usuario || !senhaConfere) {
      /* 401 Unauthorized. A mensagem é genérica de propósito: dizer
         "e-mail não existe" entregaria a lista de cadastrados.
         Corresponde à Msg2 do TG. */
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    return res.json({
      mensagem: 'Login efetuado com sucesso.',
      usuario: {
        id_usuario:        usuario.id_usuario,
        nome_usuario:      usuario.nome_usuario,
        email:             usuario.email,
        nivel_experiencia: usuario.nivel_experiencia
      }
    });

  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
