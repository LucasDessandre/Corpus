/* ==========================================================================
   CORPUS — Comportamento compartilhado da casca do site
   --------------------------------------------------------------------------
   Injeta a topbar, a gaveta mobile e o rodapé em todas as telas, para que a
   navegação exista num lugar só. Cada página carrega este arquivo e o script
   descobre sozinho qual item do menu deve ficar marcado, a partir do nome do
   arquivo aberto.

   Uso na página:
       <script src="corpus.js"></script>

   Se a página já tiver a sua própria <header class="topbar">, o script
   respeita e não injeta outra.
   ========================================================================== */

(() => {
  'use strict';

  /* Itens do menu — um único lugar para manter a navegação */
  const NAV = [
    { href: 'dashboard.html',      label: 'Início' },
    { href: 'index.html',          label: 'Biblioteca' },
    { href: 'treino.html',         label: 'Meu Treino' },
    { href: 'evolucao.html',       label: 'Evolução' },
    { href: 'acompanhamento.html', label: 'Acompanhamento' }
  ];

  /* Arquivo atual; a raiz "/" equivale a index.html */
  const atual = (() => {
    const f = location.pathname.split('/').pop();
    return !f || f === '' ? 'index.html' : f;
  })();

  const marca = (href) => (href === atual ? ' aria-current="page"' : '');

  const LOGO = `
    <a class="logo" href="dashboard.html" aria-label="Corpus — página inicial">
      <span class="logo-mark">CO<i>RPUS</i></span>
      <span class="logo-tag">Beta</span>
    </a>`;

  /* ------------------------------------------------------------------------
     Topbar + gaveta
     ---------------------------------------------------------------------- */
  function montarTopbar() {
    if (document.querySelector('.topbar')) return;   /* a página já tem a sua */

    const header = document.createElement('header');
    header.className = 'topbar';
    header.id = 'topbar';
    header.innerHTML = `
      <div class="wrap">
        ${LOGO}
        <nav class="menu" aria-label="Navegação principal">
          ${NAV.map((n) => `<a href="${n.href}"${marca(n.href)}>${n.label}</a>`).join('')}
        </nav>
        <div class="topbar-actions">
          <a class="shell-btn" href="perfil.html"${marca('perfil.html')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="7" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/>
            </svg>
            Minha conta
          </a>
          <button class="burger" id="burger" aria-expanded="false" aria-controls="drawer"
                  aria-label="Abrir menu de navegação">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </button>
        </div>
      </div>`;

    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.id = 'drawer';
    drawer.innerHTML = `
      <ul>
        ${NAV.map((n) => `<li><a href="${n.href}"${marca(n.href)}>${n.label}</a></li>`).join('')}
        <li><a href="perfil.html"${marca('perfil.html')}>Minha conta</a></li>
      </ul>`;

    document.body.prepend(drawer);
    document.body.prepend(header);

    const burger = header.querySelector('#burger');
    burger.addEventListener('click', () => {
      const aberto = drawer.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(aberto));
    });

    const onScroll = () => header.classList.toggle('stuck', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------------
     Rodapé
     ---------------------------------------------------------------------- */
  function montarRodape() {
    if (document.querySelector('.footer')) return;

    const f = document.createElement('footer');
    f.className = 'footer';
    f.innerHTML = `
      <div class="wrap">
        <div class="footer-cols">
          <div class="footer-brand">
            <span class="logo"><span class="logo-mark">CO<i>RPUS</i></span></span>
            <p>
              Plataforma web de apoio a praticantes de musculação, com foco na prevenção de
              lesões e na promoção de uma prática segura, autônoma e eficiente.
            </p>
          </div>
          <div>
            <h4>Navegação</h4>
            <ul>
              ${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}
              <li><a href="perfil.html">Minha conta</a></li>
            </ul>
          </div>
          <div>
            <h4>O projeto</h4>
            <ul>
              <li>Trabalho de Graduação — 2026</li>
              <li>Fatec Araçatuba</li>
              <li>Análise e Desenvolvimento de Sistemas</li>
              <li>Heitor Scavassa Barbosa</li>
              <li>Lucas Grauth Dessandre</li>
            </ul>
          </div>
        </div>

        <div class="disclaimer">
          <span aria-hidden="true">⚠️</span>
          <span>
            <b>Aviso importante:</b> o conteúdo desta plataforma tem finalidade educativa e não
            substitui a avaliação de um profissional de educação física ou de saúde. Em caso de
            dor persistente, interrompa o exercício e procure orientação especializada.
          </span>
        </div>

        <div class="footer-end">
          <span>© 2026 Corpus — Treine certo, evolua sempre.</span>
          <span>Orientação: Prof.ª Dr.ª Renata de Freitas Góis Comparoni</span>
        </div>
      </div>`;

    document.body.appendChild(f);
  }

  /* ------------------------------------------------------------------------
     Toast — usado por várias telas
     ---------------------------------------------------------------------- */
  let tt = null;
  window.corpusToast = function (msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.id = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => el.classList.remove('show'), 2800);
  };

  function init() {
    /* As telas de login e cadastro usam <body data-shell="none">: quem ainda
       não entrou não deve ver o menu de áreas internas nem o rodapé completo. */
    if (document.body.dataset.shell === 'none') return;
    montarTopbar();
    montarRodape();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
