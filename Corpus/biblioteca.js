/* ==========================================================================
   CORPUS — Biblioteca de Exercícios
   Lógica da interface em JavaScript puro (v2).

   Duas rotas reais dentro da mesma página, controladas pelo hash da URL:

       #/                          → catálogo
       #/exercicio/supino-reto     → ficha do exercício

   Isso faz a biblioteca se comportar como um site: cada exercício tem
   endereço próprio, o botão "voltar" do navegador funciona e a ficha pode
   ser compartilhada por link. O hash foi escolhido no lugar do pushState
   para que a página continue funcionando mesmo aberta direto do disco
   (protocolo file://), sem precisar de servidor.

   Requisitos atendidos:
     RF 03  Biblioteca de exercícios
     RF 04  Filtragem por grupo muscular + contador de resultados
     RF 05  Vídeo de execução com player incorporado
     RF 06  Orientações técnicas: passo a passo, alertas e dicas
     RNF 01 Mobile-first e alvos otimizados para toque
     RNF 02 Renderização por DOM, sem recarregar a página; vídeo sob demanda
   ========================================================================== */

(() => {
  'use strict';

  /* ========================================================================
     1. MOCK DATA — simula `GET /api/exercicios`
     ------------------------------------------------------------------------
     Espelha as tabelas `exercicio` e `grupo_muscular` do banco MySQL.
     Para plugar a API real, troque este array por:

         const mockExercicios = await (await fetch('/api/exercicios')).json();

     `youtubeId`: ao preencher, o player passa a usar o vídeo incorporado do
     YouTube (RF 05). Vazio, usa o arquivo local de `videoUrl`.
     ======================================================================== */
  const mockExercicios = [
    /* ── PEITO ───────────────────────────────────────────────────────── */
    {
      id: 'supino-reto',
      nome: 'Supino Reto com Barra',
      grupo: 'peito',
      grupoLabel: 'Peito',
      secundario: ['Tríceps', 'Deltóide Ant.'],
      dificuldade: 'iniciante',
      equipamento: 'Barra e banco reto',
      videoUrl: 'videos/supino_reto_barra.mp4',
      youtubeId: '',
      passos: [
        'Deite no banco com os pés firmes no chão, largura dos ombros.',
        'Segure a barra levemente mais larga que os ombros, palmas para frente.',
        'Desça a barra de forma controlada até tocar levemente o peitoral (altura do mamilo).',
        'Empurre a barra para cima exalando o ar, contraindo o peitoral ao final.',
        'Mantenha as escápulas retraídas e os glúteos no banco durante toda a execução.'
      ],
      alertas: [
        { critico: true,  texto: 'Nunca solte a barra ou faça a descida de forma explosiva sem controle.' },
        { critico: false, texto: 'Evite arquear excessivamente a lombar — o arco natural é permitido.' },
        { critico: false, texto: 'Não trave os cotovelos na extensão total para proteger as articulações.' },
        { critico: false, texto: 'Use sempre um "spotter" (ajudante que acompanha e auxilia em exercícios pesados, garantindo sua segurança durante a falha muscular) ao trabalhar próximo da carga máxima.' }
      ],
      dicas: [
        '"Espreme" o peitoral ao topo do movimento para maior ativação muscular.',
        'Controle a descida em ~3 segundos para maximizar o trabalho excêntrico.',
        'Varie a largura de pegada para recrutar diferentes partes do peitoral.'
      ]
    },
    {
      id: 'crucifixo',
      nome: 'Crucifixo com Halteres',
      grupo: 'peito',
      grupoLabel: 'Peito',
      secundario: ['Deltóide Ant.'],
      dificuldade: 'iniciante',
      equipamento: 'Halteres e banco reto',
      videoUrl: 'videos/crucifixo_com_halteres.mp4',
      youtubeId: '',
      passos: [
        'Deite no banco com um halter em cada mão, braços estendidos acima do peito.',
        'Com cotovelos levemente flexionados, abra os braços lateralmente em arco amplo.',
        'Desça até sentir o alongamento no peitoral (halteres na altura dos ombros).',
        'Retorne subindo em arco, como se estivesse "abraçando uma árvore grande".'
      ],
      alertas: [
        { critico: true,  texto: 'Não abra os braços além do ombro — risco de lesão no manguito rotador.' },
        { critico: false, texto: 'Mantenha a leve flexão dos cotovelos durante todo o movimento.' },
        { critico: false, texto: 'Use pesos moderados — não é um exercício para cargas máximas.' }
      ],
      dicas: [
        'Amplitude é mais importante que carga neste exercício.',
        'Segure 1 segundo no ponto de maior alongamento para intensificar.'
      ]
    },
    {
      id: 'flexao',
      nome: 'Flexão de Braço',
      grupo: 'peito',
      grupoLabel: 'Peito',
      secundario: ['Tríceps', 'Deltóide', 'Core'],
      dificuldade: 'iniciante',
      equipamento: 'Peso do corpo',
      videoUrl: 'videos/flexao_de_braco.mp4',
      youtubeId: '',
      passos: [
        'Posicione mãos levemente mais largas que os ombros, corpo em linha reta.',
        'Mantenha o abdômen contraído e os glúteos alinhados — sem elevar o quadril.',
        'Desça o tórax até próximo ao chão, cotovelos a 45° do tronco.',
        'Empurre o chão e suba até extensão dos cotovelos (sem travar completamente).'
      ],
      alertas: [
        { critico: false, texto: 'Não deixe o quadril afundar ou subir — corpo deve ser rígido.' },
        { critico: false, texto: 'Se sentir dor no punho, tente apoio nos punhos fechados.' }
      ],
      dicas: [
        'Para facilitar, apoie os joelhos; para dificultar, eleve os pés.',
        'Faça pausas de 2 seg no fundo para aumentar a intensidade.'
      ]
    },

    /* ── COSTAS ──────────────────────────────────────────────────────── */
    {
      id: 'remada-curvada',
      nome: 'Remada Curvada com Barra',
      grupo: 'costas',
      grupoLabel: 'Costas',
      secundario: ['Bíceps', 'Trapézio'],
      dificuldade: 'intermediario',
      equipamento: 'Barra',
      videoUrl: 'videos/remada_curvada_invertida.mp4',
      youtubeId: '',
      passos: [
        'Em pé, incline o tronco a 45° com coluna neutra e joelhos levemente flexionados.',
        'Segure a barra com pegada invertida, na mesma largura dos ombros.',
        'Puxe a barra em direção ao umbigo, retraindo as escápulas ao final.',
        'Desça de forma controlada até extensão completa dos braços.',
        'Mantenha o olhar para baixo/frente para preservar a neutralidade cervical.'
      ],
      alertas: [
        { critico: true,  texto: 'Nunca arredonde a lombar — causa mais comum de hérnia de disco.' },
        { critico: false, texto: 'Não use impulso excessivo do quadril para levantar a carga.' },
        { critico: false, texto: 'Se sentir dor na lombar, reduza a carga e verifique a postura.' },
        { critico: false, texto: 'Mantenha o abdômen contraído durante toda a execução.' }
      ],
      dicas: [
        'Pense em "puxar os cotovelos para trás" em vez de puxar pelas mãos.',
        'Varie entre pegada pronada e supinada para ativação diferente do dorsal.'
      ]
    },
    {
      id: 'puxada-pulley',
      nome: 'Puxada no Pulley',
      grupo: 'costas',
      grupoLabel: 'Costas',
      secundario: ['Bíceps', 'Rombóides'],
      dificuldade: 'iniciante',
      equipamento: 'Polia alta',
      videoUrl: 'videos/puxada_pulley.mp4',
      youtubeId: '',
      passos: [
        'Sente-se com as coxas presas sob o suporte, coluna ereta.',
        'Segure a barra com pegada pronada mais larga que os ombros.',
        'Puxe a barra até a parte superior do peitoral, cotovelos para baixo e para trás.',
        'Retorne de forma lenta e controlada, alongando o dorsal na posição inicial.'
      ],
      alertas: [
        { critico: true,  texto: 'Nunca puxe a barra atrás da nuca — risco real de lesão cervical.' },
        { critico: false, texto: 'Evite balançar o tronco para usar impulso em vez de força muscular.' },
        { critico: false, texto: 'Mantenha o peito levemente projetado para frente durante o puxão.' }
      ],
      dicas: [
        'Foque em sentir o dorsal trabalhando, não apenas os braços.',
        'Pausa de 1 segundo na posição contraída aumenta a eficácia.'
      ]
    },
    {
      id: 'terra',
      nome: 'Levantamento Terra',
      grupo: 'costas',
      grupoLabel: 'Costas',
      secundario: ['Pernas', 'Glúteos', 'Core'],
      dificuldade: 'avancado',
      equipamento: 'Barra',
      videoUrl: 'videos/levantamento_terra.mp4',
      youtubeId: '',
      passos: [
        'Pés na largura do quadril, barra sobre o meio do pé.',
        'Flexione quadris e joelhos, segure a barra com pegada pronada ou mista.',
        'Peito para cima, coluna neutra e braços retos antes de iniciar.',
        'Empurre o chão com os pés e suba a barra rente ao corpo até extensão total.',
        'Desça revertendo o movimento com controle, coluna sempre neutra.'
      ],
      alertas: [
        { critico: true,  texto: 'Nunca arredonde a lombar — esta é a principal causa de lesões graves.' },
        { critico: true,  texto: 'Não realize com fadiga extrema — erros com carga alta são perigosos.' },
        { critico: false, texto: 'Domine a técnica sem carga antes de progredir em peso.' },
        { critico: false, texto: 'Use cinto e straps apenas após dominar completamente a técnica limpa.' }
      ],
      dicas: [
        '"Quebre o chão" com os pés para ativar a cadeia posterior completa.',
        'O terra recruta mais músculos que praticamente qualquer outro exercício.'
      ]
    },

    /* ── PERNAS ──────────────────────────────────────────────────────── */
    {
      id: 'agachamento',
      nome: 'Agachamento Livre',
      grupo: 'pernas',
      grupoLabel: 'Pernas',
      secundario: ['Glúteos', 'Lombar', 'Core'],
      dificuldade: 'iniciante',
      equipamento: 'Barra e suporte',
      videoUrl: 'videos/agachamento_livre.mp4',
      youtubeId: '',
      passos: [
        'Pés na largura dos ombros (ou um pouco mais), dedos levemente para fora.',
        'Peito erguido, lombar neutra, olhar para frente ou levemente para cima.',
        'Flexione joelhos e quadril simultaneamente, como se fosse sentar numa cadeira.',
        'Desça até as coxas ficarem paralelas ao chão (ou mais, conforme mobilidade).',
        'Suba empurrando o chão com os pés e contraindo os glúteos ao topo.'
      ],
      alertas: [
        { critico: true,  texto: 'Nunca deixe os joelhos "fechar" (valgo) — devem seguir a linha dos pés.' },
        { critico: false, texto: 'Não projete o tronco excessivamente para frente ou arredonde a lombar.' },
        { critico: false, texto: 'Inicie sem carga para dominar o padrão antes de adicionar peso.' },
        { critico: false, texto: 'Dor nos joelhos pode indicar problema na dorsiflexão do tornozelo.' }
      ],
      dicas: [
        'Imagine "espalhar o chão" com os pés para ativar os glúteos.',
        'Elevação leve sob os calcanhares pode ajudar iniciantes com mobilidade limitada.'
      ]
    },
    {
      id: 'leg-press',
      nome: 'Leg Press 45°',
      grupo: 'pernas',
      grupoLabel: 'Pernas',
      secundario: ['Glúteos', 'Isquiotibiais'],
      dificuldade: 'iniciante',
      equipamento: 'Leg press 45°',
      videoUrl: 'videos/leg_press_45_graus.mp4',
      youtubeId: '',
      passos: [
        'Pés na plataforma na largura dos ombros, mais acima para mais glúteo.',
        'Segure os pegadores laterais e desbloqueie a trava de segurança.',
        'Flexione os joelhos até 90° ou conforme mobilidade permitir.',
        'Empurre a plataforma de volta sem travar completamente os joelhos.'
      ],
      alertas: [
        { critico: true,  texto: 'Nunca deixe as costas saírem do encosto durante a descida.' },
        { critico: true,  texto: 'Nunca trave os joelhos na extensão máxima — alto risco de lesão articular.' },
        { critico: false, texto: 'Não desça além do ponto onde a lombar começa a sair do encosto.' },
        { critico: false, texto: 'Sempre recoloque a trava de segurança ao finalizar a série.' }
      ],
      dicas: [
        'Pés mais altos recrutam mais glúteos; mais baixos, mais quadríceps.',
        'Descida em ~3 seg maximiza o trabalho muscular (fase excêntrica).'
      ]
    },

    /* ── OMBROS ──────────────────────────────────────────────────────── */
    {
      id: 'desenvolvimento',
      nome: 'Desenvolvimento c/ Halteres',
      grupo: 'ombros',
      grupoLabel: 'Ombros',
      secundario: ['Tríceps'],
      dificuldade: 'iniciante',
      equipamento: 'Halteres e banco com encosto',
      videoUrl: 'videos/desenvolvimento_halteres.mp4',
      youtubeId: '',
      passos: [
        'Sente-se num banco com encosto reto, um halter em cada mão na altura dos ombros.',
        'Palmas voltadas para frente, cotovelos a 90°.',
        'Empurre os halteres para cima e levemente para o centro, sem tocá-los.',
        'Desça de forma controlada até a posição inicial (altura dos ombros).'
      ],
      alertas: [
        { critico: false, texto: 'Não empurre os halteres atrás da linha da cabeça — pressão na cervical.' },
        { critico: false, texto: 'Evite arquear excessivamente a lombar ao empurrar o peso.' },
        { critico: false, texto: 'Mantenha os cotovelos levemente à frente do plano do corpo.' }
      ],
      dicas: [
        'Sentado oferece mais estabilidade e foco no deltóide.',
        'Girar o punho para neutro na descida reduz pressão no ombro.'
      ]
    },
    {
      id: 'elevacao-lateral',
      nome: 'Elevação Lateral',
      grupo: 'ombros',
      grupoLabel: 'Ombros',
      secundario: ['Trapézio'],
      dificuldade: 'iniciante',
      equipamento: 'Halteres',
      videoUrl: 'videos/elevacao_lateral_halteres.mp4',
      youtubeId: '',
      passos: [
        'Em pé com halteres ao lado do corpo, cotovelos levemente flexionados.',
        'Eleve os braços lateralmente até a altura dos ombros.',
        'O cotovelo deve ser o ponto mais alto — como "derramar água de um balde".',
        'Desça os halteres de forma lenta e controlada.'
      ],
      alertas: [
        { critico: false, texto: 'Não use impulso do tronco — o movimento deve ser isolado no ombro.' },
        { critico: false, texto: 'Eleve apenas até a altura dos ombros para proteger o manguito rotador.' },
        { critico: false, texto: 'O deltóide medial é pequeno — use cargas leves e foque na técnica.' }
      ],
      dicas: [
        'Inclinação ~10° para frente ativa mais o deltóide medial.',
        'Descida em 3-4 seg maximiza o estímulo muscular.'
      ]
    },

    /* ── BRAÇOS ──────────────────────────────────────────────────────── */
    {
      id: 'rosca-direta',
      nome: 'Rosca Direta',
      grupo: 'bracos',
      grupoLabel: 'Braços',
      secundario: ['Braquial', 'Braquiorradial'],
      dificuldade: 'iniciante',
      equipamento: 'Barra ou halteres',
      videoUrl: 'videos/rosca_direta.mp4',
      youtubeId: '',
      passos: [
        'Em pé, segure a barra ou halteres com pegada supinada (palmas para cima).',
        'Mantenha os cotovelos fixos ao lado do tronco — ponto crítico do exercício.',
        'Flexione os cotovelos subindo a carga até próxima ao peitoral.',
        'Desça de forma controlada até extensão completa para alongar o bíceps.'
      ],
      alertas: [
        { critico: true,  texto: 'Cotovelos móveis significam bíceps menos ativado e risco de lesão no cotovelo.' },
        { critico: false, texto: 'Não "jogue" a carga com impulso do quadril — reduz o trabalho muscular.' },
        { critico: false, texto: 'Cuidado com hiperextensão dos cotovelos na posição final (descida).' }
      ],
      dicas: [
        'Descida lenta (fase excêntrica) maximiza a ativação.',
        'Girar o punho para fora ao subir ativa mais o bíceps breve.'
      ]
    },
    {
      id: 'triceps-corda',
      nome: 'Tríceps na Corda (Pulley)',
      grupo: 'bracos',
      grupoLabel: 'Braços',
      secundario: ['Antebraço'],
      dificuldade: 'iniciante',
      equipamento: 'Polia alta com corda',
      videoUrl: 'videos/triceps_corda_polia.mp4',
      youtubeId: '',
      passos: [
        'Posicione-se frente ao pulley alto com a corda, palmas voltadas uma para a outra.',
        'Cotovelos fixos ao lado do tronco, leve inclinação do tronco para frente.',
        'Estenda os cotovelos puxando a corda para baixo, separando as pontas ao final.',
        'Retorne de forma controlada à posição inicial, sentindo o alongamento do tríceps.'
      ],
      alertas: [
        { critico: false, texto: 'Não deixe os cotovelos abrirem para os lados durante a extensão.' },
        { critico: false, texto: 'Evite balançar o tronco — movimento deve ser isolado no cotovelo.' },
        { critico: false, texto: 'Não "quebre" os punhos (desvio ulnar) na posição final.' }
      ],
      dicas: [
        'Separar as pontas da corda ao final ativa a cabeça lateral do tríceps.',
        'Drop-sets (redução progressiva de carga) intensificam o treino.'
      ]
    },

    /* ── CORE ────────────────────────────────────────────────────────── */
    {
      id: 'prancha',
      nome: 'Prancha Isométrica',
      grupo: 'core',
      grupoLabel: 'Core',
      secundario: ['Glúteos', 'Ombros'],
      dificuldade: 'iniciante',
      equipamento: 'Peso do corpo',
      videoUrl: 'videos/prancha_isometrica.mp4',
      youtubeId: '',
      passos: [
        'Apoie antebraços e pontas dos pés, formando linha reta tornozelo-cabeça.',
        'Abdômen contraído e glúteos levemente ativados.',
        'Respire normalmente e mantenha a posição pelo tempo definido.',
        'Olhar para o chão, pescoço em posição neutra.'
      ],
      alertas: [
        { critico: false, texto: 'Evite deixar o quadril subir ou cair — linha do corpo deve ser reta.' },
        { critico: false, texto: 'Não prenda a respiração durante o exercício.' },
        { critico: false, texto: 'Reduza o tempo se sentir dor lombar — provável postura incorreta.' }
      ],
      dicas: [
        'Contraia o abdômen como se fosse apanhar um soco para maximizar a ativação.',
        'Progrida gradualmente: 30s → 45s → 60s → 90s.'
      ]
    }
  ];

  /* Grupos musculares — espelha a tabela `grupo_muscular` */
  const GRUPOS = [
    { id: 'todos',  label: 'Todos' },
    { id: 'peito',  label: 'Peito' },
    { id: 'costas', label: 'Costas' },
    { id: 'pernas', label: 'Pernas' },
    { id: 'ombros', label: 'Ombros' },
    { id: 'bracos', label: 'Braços' },
    { id: 'core',   label: 'Core' }
  ];

  const NIVEL = {
    iniciante:     'Iniciante',
    intermediario: 'Intermediário',
    avancado:      'Avançado'
  };

  /* ========================================================================
     2. ESTADO
     ======================================================================== */
  const state = {
    grupo: 'todos',
    busca: '',
    ordem: 'nome'
  };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* Escapa dados antes de injetar no HTML */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Minúsculas e sem acento — na academia ninguém digita "glúteos" com acento */
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* Caminho da miniatura, derivado do vídeo: videos/x.mp4 → thumbs/x.jpg */
  const thumbOf = (ex) => ex.videoUrl.replace('videos/', 'thumbs/').replace('.mp4', '.jpg');

  const el = {};

  /* ========================================================================
     3. CATÁLOGO — filtragem, ordenação e render (RF 03 e RF 04)
     ======================================================================== */
  function filtrar() {
    const termo = norm(state.busca.trim());

    const lista = mockExercicios.filter((ex) => {
      const okGrupo = state.grupo === 'todos' || ex.grupo === state.grupo;
      const okBusca = !termo
        || norm(ex.nome).includes(termo)
        || norm(ex.grupoLabel).includes(termo)
        || norm(ex.equipamento).includes(termo)
        || ex.secundario.some((m) => norm(m).includes(termo));
      return okGrupo && okBusca;
    });

    const peso = { iniciante: 1, intermediario: 2, avancado: 3 };

    return lista.sort((a, b) => {
      if (state.ordem === 'nivel') {
        const d = peso[a.dificuldade] - peso[b.dificuldade];
        if (d) return d;
      }
      if (state.ordem === 'grupo') {
        const d = a.grupoLabel.localeCompare(b.grupoLabel, 'pt-BR');
        if (d) return d;
      }
      if (state.ordem === 'risco') {
        const d = b.alertas.filter((x) => x.critico).length - a.alertas.filter((x) => x.critico).length;
        if (d) return d;
      }
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }

  /* Markup de um card. `i` só controla o atraso da animação de entrada. */
  function cardHTML(ex, i = 0) {
    const criticos = ex.alertas.filter((a) => a.critico).length;

    return `
      <a class="card" href="#/exercicio/${ex.id}" style="animation-delay:${Math.min(i * 0.045, 0.45)}s">
        <span class="thumb">
          <img src="${thumbOf(ex)}" alt="Execução do exercício ${esc(ex.nome)}"
               loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async"
               onerror="this.style.display='none'">
          <span class="badges">
            <span class="badge badge-group">${esc(ex.grupoLabel)}</span>
            <span class="badge badge-${ex.dificuldade}">${NIVEL[ex.dificuldade]}</span>
            ${criticos ? `
              <span class="badge badge-risk" title="${criticos} alerta(s) crítico(s)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="3" stroke-linecap="round" aria-hidden="true">
                  <path d="M12 9v4M12 17h.01"/>
                </svg>${criticos}
              </span>` : ''}
          </span>
          <span class="play" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </span>
          <span class="name">${esc(ex.nome)}</span>
        </span>

        <span class="card-info">
          <span class="muscles"><b>Secundários:</b> ${ex.secundario.map(esc).join(', ')}</span>

          <span class="card-meta">
            <span class="metaitem">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
              </svg>${ex.passos.length} passos
            </span>
            <span class="metaitem${criticos ? ' danger' : ''}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
              </svg>${ex.alertas.length} alertas
            </span>
            <span class="card-go">
              Ver ficha
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </span>
          </span>
        </span>
      </a>`;
  }

  function renderCatalogo() {
    const lista = filtrar();

    /* Contador de exercícios encontrados — obrigatório no RF 04 */
    el.tally.innerHTML = lista.length === 1
      ? '<b>1</b> exercício encontrado'
      : `<b>${lista.length}</b> exercícios encontrados`;

    $$('.pill').forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.grupo === state.grupo)));

    if (!lista.length) {
      el.grid.innerHTML = '';
      el.empty.classList.add('show');
      return;
    }

    el.empty.classList.remove('show');
    el.grid.innerHTML = lista.map(cardHTML).join('');
  }

  /* ========================================================================
     4. FICHA DO EXERCÍCIO (RF 05 e RF 06)
     ======================================================================== */
  function renderFicha(id) {
    const ex = mockExercicios.find((e) => e.id === id);
    if (!ex) { irPara('#/'); return; }

    const criticos = ex.alertas.filter((a) => a.critico).length;

    /* Relacionados: mesmo grupo primeiro, completando com outros */
    const relacionados = [
      ...mockExercicios.filter((e) => e.grupo === ex.grupo && e.id !== ex.id),
      ...mockExercicios.filter((e) => e.grupo !== ex.grupo && e.id !== ex.id)
    ].slice(0, 4);

    el.detail.innerHTML = `
      <div class="wrap">

        <a class="back" href="#/">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Voltar para a biblioteca
        </a>

        <header class="detail-head">
          <div class="detail-tags">
            <span class="badge badge-group">${esc(ex.grupoLabel)}</span>
            <span class="badge badge-${ex.dificuldade}">${NIVEL[ex.dificuldade]}</span>
            ${criticos ? `<span class="badge badge-risk">${criticos} alerta${criticos > 1 ? 's' : ''} crítico${criticos > 1 ? 's' : ''}</span>` : ''}
          </div>
          <h1>${esc(ex.nome)}</h1>
          <p class="detail-sub">
            Movimento de <b>${esc(ex.grupoLabel.toLowerCase())}</b> executado com
            <b>${esc(ex.equipamento.toLowerCase())}</b>. Leia os alertas de segurança antes
            de aumentar a carga.
          </p>
        </header>

        <div class="detail-cols">

          <!-- Mídia e ficha técnica -->
          <div class="detail-media">
            <div class="player" id="player">
              <button class="player-cover" id="playerCover"
                      aria-label="Reproduzir vídeo de execução de ${esc(ex.nome)}">
                <img src="${thumbOf(ex)}" alt="" onerror="this.style.display='none'">
                <span class="ring" aria-hidden="true">
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </span>
                <span>Ver execução</span>
              </button>
            </div>
            <p class="media-note">O vídeo só é baixado ao ser solicitado, para poupar dados na academia.</p>

            <dl class="factbox">
              <div class="factrow"><dt>Grupo principal</dt><dd>${esc(ex.grupoLabel)}</dd></div>
              <div class="factrow"><dt>Secundários</dt><dd>${ex.secundario.map(esc).join(', ')}</dd></div>
              <div class="factrow"><dt>Equipamento</dt><dd>${esc(ex.equipamento)}</dd></div>
              <div class="factrow"><dt>Nível</dt><dd>${NIVEL[ex.dificuldade]}</dd></div>
            </dl>

            <button class="btn-primary" id="btnAdd">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="3" stroke-linecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Adicionar ao meu treino
            </button>
          </div>

          <!-- Orientações técnicas escritas (RF 06) -->
          <div class="detail-content">

            <section class="section">
              <h2 class="section-title"><span class="n">1</span> Como executar</h2>
              <ol class="steps">
                ${ex.passos.map((p, i) => `
                  <li class="step">
                    <span class="step-n">${i + 1}</span>
                    <p>${esc(p)}</p>
                  </li>`).join('')}
              </ol>
            </section>

            <section class="section">
              <h2 class="section-title"><span class="n">2</span> Alertas de segurança</h2>
              <ul class="notes">
                ${ex.alertas.map((a) => `
                  <li class="note ${a.critico ? 'note-crit' : 'note-warn'}">
                    <span class="ico" aria-hidden="true">${a.critico ? '🚨' : '⚠️'}</span>
                    <span>${a.critico ? '<b>Crítico:</b> ' : ''}${esc(a.texto)}</span>
                  </li>`).join('')}
              </ul>
            </section>

            <section class="section">
              <h2 class="section-title"><span class="n">3</span> Dicas de execução</h2>
              <ul class="notes">
                ${ex.dicas.map((d) => `
                  <li class="note note-tip">
                    <span class="ico" aria-hidden="true">💡</span>
                    <span>${esc(d)}</span>
                  </li>`).join('')}
              </ul>
            </section>

          </div>
        </div>

        <section class="related">
          <h2>Outros exercícios de ${esc(ex.grupoLabel.toLowerCase())}</h2>
          <div class="grid">
            ${relacionados.map((r, i) => cardHTML(r, i)).join('')}
          </div>
        </section>

      </div>`;

    $('#playerCover').addEventListener('click', () => tocarVideo(ex));
    $('#btnAdd').addEventListener('click', () => adicionarAoTreino(ex));

    document.title = `${ex.nome} — Biblioteca CORPUS`;
  }

  /* Carrega o player só quando pedido (RNF 02) */
  function tocarVideo(ex) {
    const player = $('#player');
    const cover  = $('#playerCover');
    if (!player || !cover) return;

    cover.remove();

    if (ex.youtubeId) {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube.com/embed/${ex.youtubeId}?autoplay=1&rel=0`;
      f.title = `Vídeo de execução — ${ex.nome}`;
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      player.appendChild(f);
    } else {
      const v = document.createElement('video');
      v.src = ex.videoUrl;
      v.poster = thumbOf(ex);
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('aria-label', `Vídeo de execução — ${ex.nome}`);
      player.appendChild(v);
    }
  }

  /* ========================================================================
     5. ROTEAMENTO POR HASH
     ======================================================================== */
  function irPara(hash) {
    if (location.hash === hash) rotear();
    else location.hash = hash;
  }

  function rotear() {
    const m = location.hash.match(/^#\/exercicio\/([\w-]+)$/);

    if (m) {
      renderFicha(m[1]);
      el.viewCatalogo.classList.remove('active');
      el.viewDetail.classList.add('active');
    } else {
      el.viewDetail.classList.remove('active');
      el.viewCatalogo.classList.add('active');
      el.detail.innerHTML = '';
      document.title = 'Biblioteca de Exercícios — CORPUS';
    }

    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    /* Fecha a gaveta ao trocar de rota — ela é injetada pelo corpus.js, por
       isso a busca é feita agora e não guardada em cache no início. */
    const drawer = document.getElementById('drawer');
    const burger = document.getElementById('burger');
    if (drawer) drawer.classList.remove('open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }

  /* ========================================================================
     6. TREINO E TOAST
     ======================================================================== */
  function adicionarAoTreino(ex) {
    const treino = JSON.parse(localStorage.getItem('ff_treino') || '[]');

    if (treino.some((e) => e.id === ex.id)) {
      toast(`"${ex.nome}" já está no seu treino.`);
      return;
    }

    treino.push({ id: ex.id, nome: ex.nome, series: 3, reps: 12, cargaAnterior: 0 });
    localStorage.setItem('ff_treino', JSON.stringify(treino));
    toast(`${ex.nome} adicionado ao treino 💪`);
  }

  let tt = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => el.toast.classList.remove('show'), 2800);
  }

  /* ========================================================================
     7. INICIALIZAÇÃO
     ======================================================================== */
  function init() {
    Object.assign(el, {
      viewCatalogo: $('#viewCatalogo'),
      viewDetail:   $('#viewDetail'),
      detail:       $('#detailRoot'),
      grid:         $('#grid'),
      empty:        $('#empty'),
      tally:        $('#tally'),
      groups:       $('#groups'),
      busca:        $('#q'),
      buscaX:       $('#qClear'),
      ordem:        $('#sort'),
      reset:        $('#reset'),
      resetEmpty:   $('#resetEmpty'),
      toast:        $('#toast')
    });

    /* Pílulas de grupo muscular, com a contagem de cada um */
    el.groups.innerHTML = GRUPOS.map((g) => {
      const n = g.id === 'todos'
        ? mockExercicios.length
        : mockExercicios.filter((e) => e.grupo === g.id).length;
      return `<button class="pill" data-grupo="${g.id}" aria-pressed="${g.id === state.grupo}">
                ${g.label} <b>${n}</b>
              </button>`;
    }).join('');

    /* Números do hero */
    $('#nTotal').textContent  = mockExercicios.length;
    $('#nGrupos').textContent = new Set(mockExercicios.map((e) => e.grupo)).size;
    $('#nAlertas').textContent = mockExercicios.reduce((s, e) => s + e.alertas.length, 0);

    /* --- Eventos --- */
    el.groups.addEventListener('click', (e) => {
      const p = e.target.closest('.pill');
      if (!p) return;
      state.grupo = p.dataset.grupo;
      renderCatalogo();
    });

    el.busca.addEventListener('input', (e) => {
      state.busca = e.target.value;
      renderCatalogo();
    });

    el.buscaX.addEventListener('click', () => {
      state.busca = '';
      el.busca.value = '';
      el.busca.focus();
      renderCatalogo();
    });

    el.ordem.addEventListener('change', (e) => {
      state.ordem = e.target.value;
      renderCatalogo();
    });

    const limpar = () => {
      state.grupo = 'todos';
      state.busca = '';
      el.busca.value = '';
      renderCatalogo();
    };

    el.reset.addEventListener('click', limpar);
    el.resetEmpty.addEventListener('click', limpar);

    /* A topbar, a gaveta e a sombra ao rolar são responsabilidade do corpus.js */

    window.addEventListener('hashchange', rotear);

    renderCatalogo();
    rotear();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
