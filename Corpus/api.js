/* ==========================================================================
   api.js — Cliente da API e controle de sessão
   --------------------------------------------------------------------------
   Carregado por todas as telas que conversam com o back-end. Concentra num
   lugar só três coisas que antes estariam espalhadas e duplicadas:

     1. O endereço da API      → muda em um lugar quando for para produção
     2. O tratamento de erro   → o `fetch` não lança em 4xx/5xx (ver abaixo)
     3. A sessão do usuário    → uma única chave no localStorage

   Uso:  <script src="api.js"></script>  antes do script da página.
   ========================================================================== */

const CorpusAPI = (() => {
  'use strict';

  /* ------------------------------------------------------------------------
     Endereço base da API.

     É um caminho RELATIVO de propósito. Como o servidor entrega o site e a
     API juntos, '/api' resolve sozinho para a origem correta:

        no seu PC ......  http://localhost:3000/api
        hospedado ......  https://seu-app.onrender.com/api

     Fixar 'http://localhost:3000' aqui funcionaria só na sua máquina: no ar,
     o navegador de cada visitante tentaria falar com o localhost DELE.

     A exceção é abrir os arquivos com duplo clique (protocolo file://), onde
     não existe servidor de origem — aí é preciso apontar o endereço completo.
     ---------------------------------------------------------------------- */
  const BASE = location.protocol === 'file:'
    ? 'http://localhost:3000/api'
    : '/api';

  /* Chave única da sessão. O dashboard já lia `corpus_user`, então este é o
     nome adotado em todas as telas — antes o cadastro gravava em três chaves
     soltas (`ff_user_name`, `ff_user_email`, `ff_user_nivel`) que ninguém lia,
     e por isso o nome do usuário nunca aparecia na tela inicial. */
  const CHAVE_SESSAO = 'corpus_user';

  /* ------------------------------------------------------------------------
     Requisição genérica.

     PEGADINHA DO FETCH: ele só rejeita a Promise quando a requisição nem sai
     (servidor fora do ar, DNS, CORS). Um 404 ou 500 é considerado SUCESSO,
     porque houve resposta. Por isso é preciso checar `resposta.ok` na mão —
     é o que esta função faz, devolvendo sempre o mesmo formato:

         { ok: true,  dados }              em caso de sucesso
         { ok: false, status, mensagem }   em caso de erro
     ---------------------------------------------------------------------- */
  async function requisitar(caminho, opcoes = {}) {
    try {
      const resposta = await fetch(BASE + caminho, {
        headers: { 'Content-Type': 'application/json' },
        ...opcoes
      });

      /* Respostas 204 (sem conteúdo) não têm corpo para converter */
      const corpo = resposta.status === 204 ? {} : await resposta.json();

      if (!resposta.ok) {
        /* A API devolve `erro` e, nas validações, `detalhes` com a lista */
        const detalhes = Array.isArray(corpo.detalhes) ? corpo.detalhes.join(' ') : '';
        return {
          ok: false,
          status: resposta.status,
          mensagem: detalhes || corpo.erro || `A API respondeu com status ${resposta.status}.`
        };
      }

      return { ok: true, dados: corpo };

    } catch (erro) {
      /* Cai aqui quando a API está fora do ar ou o CORS bloqueou.
         Mensagem específica: "erro de rede" não ajuda quem está testando. */
      console.error('[CorpusAPI]', erro);
      return {
        ok: false,
        status: 0,
        mensagem: 'Não foi possível falar com o servidor. '
                + 'Verifique se a API está rodando (npm start na pasta api).'
      };
    }
  }

  const get  = (caminho)        => requisitar(caminho);
  const post = (caminho, corpo) => requisitar(caminho, {
    method: 'POST',
    body: JSON.stringify(corpo)
  });

  /* ------------------------------------------------------------------------
     Sessão
     ---------------------------------------------------------------------- */
  const sessao = {
    /* Grava o usuário autenticado. O formato { nome, nivel } é o que a tela
       inicial já esperava — manter assim evita mexer no dashboard. */
    salvar(usuario) {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
        id:    usuario.id_usuario,
        nome:  usuario.nome_usuario,
        email: usuario.email,
        nivel: usuario.nivel_experiencia
      }));
    },

    ler() {
      try {
        return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null');
      } catch {
        return null;
      }
    },

    logado() {
      return this.ler() !== null;
    },

    encerrar() {
      localStorage.removeItem(CHAVE_SESSAO);
    },

    /* Redireciona para o login se não houver sessão.
       Chame no topo das telas internas. */
    exigir(destino = 'login.html') {
      if (!this.logado()) {
        window.location.href = destino;
        return false;
      }
      return true;
    }
  };

  /* ------------------------------------------------------------------------
     Endpoints usados pelas telas
     ---------------------------------------------------------------------- */
  return {
    BASE,
    get,
    post,
    sessao,

    /* RF 01 */
    cadastrar: (nome, email, senha, nivel) => post('/usuarios/cadastro', {
      nome_usuario: nome,
      email,
      senha,
      nivel_experiencia: nivel
    }),

    /* RF 02 */
    login: (email, senha) => post('/usuarios/login', { email, senha }),

    /* RF 03 e RF 04 */
    exercicios: (grupo, busca) => {
      const p = new URLSearchParams();
      if (grupo && grupo !== 'todos') p.set('grupo', grupo);
      if (busca) p.set('busca', busca);
      const qs = p.toString();
      return get('/exercicios' + (qs ? '?' + qs : ''));
    },

    /* RF 10 */
    registrarCarga: (idUsuario, idExercicio, carga) => post('/treinos/carga', {
      id_usuario: idUsuario,
      id_exercicio: idExercicio,
      carga_utilizada: carga
    }),

    /* RF 11 */
    historicoCargas: (idUsuario) => get(`/treinos/carga/${idUsuario}`),

    /* Diz se a API está no ar — usado para avisar antes de o usuário
       preencher um formulário inteiro à toa. */
    async online() {
      const r = await get('/health');
      return r.ok;
    }
  };
})();
