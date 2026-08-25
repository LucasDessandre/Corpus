/* ==========================================================================
   exemplo-integracao.js
   --------------------------------------------------------------------------
   Como consumir a API a partir do front-end, em JavaScript puro (Vanilla JS),
   usando a função nativa `fetch()`.

   Para testar rapidamente:
     1. Suba a API      →  cd api && npm start
     2. Abra qualquer página do front-end no navegador
     3. Abra o Console (F12) e cole o conteúdo deste arquivo
   ========================================================================== */

/* Endereço base da API. Em produção, troque pelo domínio do servidor. */
const API_URL = 'http://localhost:3000/api';


/* ==========================================================================
   EXEMPLO 1 — O básico: buscar os exercícios e imprimir no console
   --------------------------------------------------------------------------
   `fetch` devolve uma Promise. Como ela leva um tempo para resolver, usamos
   `await` — e `await` só funciona dentro de uma função marcada com `async`.
   ========================================================================== */
async function buscarExercicios() {
  // 1. Faz a requisição HTTP. GET é o método padrão, não precisa declarar.
  const resposta = await fetch(`${API_URL}/exercicios`);

  // 2. Converte o corpo da resposta (que vem como texto) em objeto JavaScript.
  const dados = await resposta.json();

  // 3. Usa os dados.
  console.log('Resposta completa:', dados);
  console.log('Total de exercícios:', dados.total);
  console.table(dados.exercicios.map((e) => ({
    id: e.id,
    nome: e.nome,
    grupo: e.grupoLabel,
    passos: e.passos.length,
    alertas: e.alertas.length
  })));

  return dados.exercicios;
}

buscarExercicios();


/* ==========================================================================
   EXEMPLO 2 — A versão correta: com tratamento de erro
   --------------------------------------------------------------------------
   ATENÇÃO A UMA PEGADINHA DO FETCH:

   O `fetch` só rejeita a Promise quando a requisição nem sai (servidor fora
   do ar, DNS errado, CORS bloqueado). Se o servidor responder 404 ou 500,
   o `fetch` considera SUCESSO — afinal, houve resposta.

   Por isso é preciso checar `resposta.ok` manualmente. Sem essa verificação,
   um erro do servidor passaria despercebido e o `.json()` provavelmente
   quebraria com uma mensagem confusa.
   ========================================================================== */
async function buscarExerciciosComTratamento() {
  try {
    const resposta = await fetch(`${API_URL}/exercicios`);

    // `resposta.ok` é true apenas para status de 200 a 299
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.erro || `A API respondeu com status ${resposta.status}`);
    }

    const dados = await resposta.json();
    console.log(`✅ ${dados.total} exercícios carregados`);
    return dados.exercicios;

  } catch (erro) {
    // Cai aqui tanto no erro de rede quanto no `throw` acima
    console.error('❌ Falha ao carregar exercícios:', erro.message);

    // Mensagem Msg3 do TG: "Erro ao carregar a lista de movimentos."
    return [];
  }
}


/* ==========================================================================
   EXEMPLO 3 — Filtrando por grupo muscular (RF 04)
   --------------------------------------------------------------------------
   Parâmetros vão na URL como query string: ?grupo=peito&busca=supino
   `URLSearchParams` monta isso com o escape correto de acentos e espaços.
   ========================================================================== */
async function buscarPorGrupo(grupo, busca = '') {
  const params = new URLSearchParams();
  if (grupo && grupo !== 'todos') params.set('grupo', grupo);
  if (busca) params.set('busca', busca);

  const resposta = await fetch(`${API_URL}/exercicios?${params}`);
  const dados = await resposta.json();

  console.log(`Filtro "${grupo}": ${dados.total} exercício(s)`);
  return dados.exercicios;
}

// buscarPorGrupo('peito');
// buscarPorGrupo('costas', 'remada');


/* ==========================================================================
   EXEMPLO 4 — Enviando dados: cadastro de usuário (RF 01)
   --------------------------------------------------------------------------
   Num POST é preciso declarar três coisas que o GET não exige:
     • method: 'POST'
     • headers com Content-Type: application/json
     • body com o objeto convertido em texto por JSON.stringify
   ========================================================================== */
async function cadastrarUsuario(nome, email, senha, nivel) {
  try {
    const resposta = await fetch(`${API_URL}/usuarios/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome_usuario: nome,
        email: email,
        senha: senha,
        nivel_experiencia: nivel
      })
    });

    const dados = await resposta.json();

    // 409 = e-mail já cadastrado (Msg1 do TG)
    if (resposta.status === 409) {
      console.warn('⚠️', dados.erro);
      return { ok: false, mensagem: dados.erro };
    }

    // 400 = dados inválidos; a API devolve a lista do que está errado
    if (resposta.status === 400) {
      console.warn('⚠️ Dados inválidos:', dados.detalhes);
      return { ok: false, mensagem: dados.detalhes.join(' ') };
    }

    if (!resposta.ok) throw new Error(dados.erro || 'Erro no cadastro');

    console.log('✅ Usuário criado:', dados.usuario);
    return { ok: true, usuario: dados.usuario };

  } catch (erro) {
    console.error('❌', erro.message);
    return { ok: false, mensagem: erro.message };
  }
}

// cadastrarUsuario('Lucas', 'lucas@teste.com', 'senha123', 'Iniciante');


/* ==========================================================================
   EXEMPLO 5 — Registrando carga e lendo o alerta de progressão (RF 10)
   ========================================================================== */
async function registrarCarga(idUsuario, idExercicio, carga) {
  const resposta = await fetch(`${API_URL}/treinos/carga`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_usuario: idUsuario,
      id_exercicio: idExercicio,
      carga_utilizada: carga
    })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    console.error('❌', dados.erro, dados.detalhes || '');
    return null;
  }

  console.log('✅', dados.mensagem);
  console.log('   Carga anterior:', dados.carga_anterior ?? '(primeiro registro)');

  // O alerta já vem pronto do servidor — o front-end só decide a cor
  const cores = { critico: '🚨', atencao: '⚠️', ok: '✅', info: 'ℹ️' };
  console.log(`   ${cores[dados.alerta.nivel]} ${dados.alerta.mensagem}`);

  return dados;
}

// registrarCarga(1, 1, 40);   // primeiro registro
// registrarCarga(1, 1, 44);   // +10% → ok
// registrarCarga(1, 1, 60);   // salto grande → alerta crítico


/* ==========================================================================
   EXEMPLO 6 — Ligando na tela real da Biblioteca
   --------------------------------------------------------------------------
   Hoje o `biblioteca.js` tem os dados fixos no array `mockExercicios`.
   Para trocar pelos dados do banco, a mudança é pequena:

   ANTES:
       const mockExercicios = [ { id: 'supino-reto', ... }, ... ];
       renderCatalogo();

   DEPOIS:
       let mockExercicios = [];

       async function carregarDoBanco() {
         try {
           const r = await fetch('http://localhost:3000/api/exercicios');
           if (!r.ok) throw new Error('status ' + r.status);
           const dados = await r.json();
           mockExercicios = dados.exercicios;
         } catch (e) {
           console.error('Erro ao carregar a lista de movimentos.', e);
           mockExercicios = [];        // a tela mostra o estado vazio
         }
         renderCatalogo();             // só renderiza depois que os dados chegam
       }

       carregarDoBanco();

   O ponto principal: `renderCatalogo()` precisa ser chamado DENTRO da função
   assíncrona, depois do await. Se ficar fora, ele roda antes dos dados
   chegarem e a tela aparece vazia.
   ========================================================================== */
