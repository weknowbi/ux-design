/* ═══ Weknow Healthtech — interações da landing page ═══ */
/* 1. Header com fundo escuro translúcido ao rolar */
const header = document.getElementById('header');
const onScroll = () => header?.classList.toggle('is-stuck', window.scrollY > 12);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* 2. Menu mobile */
const burger = document.querySelector('[data-burger]');
const nav = document.getElementById('nav');
burger?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
});
nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    burger?.classList.remove('is-open');
    burger?.setAttribute('aria-expanded', 'false');
  });
});

/* 3. Submenu de Soluções: abre no hover no desktop e no clique em qualquer tela */
const dropdown = document.querySelector('[data-dropdown]');
const dropdownBtn = dropdown?.querySelector('.nav__toggle');
const temHover = window.matchMedia('(hover: hover)').matches;
const abrirDropdown = (abrir) => {
  dropdown?.classList.toggle('is-open', abrir);
  dropdownBtn?.setAttribute('aria-expanded', String(abrir));
};
if (temHover) {
  /* Com mouse, o hover cuida da abertura. O clique aqui fecharia o que
     acabou de abrir, então ele fica só para telas sem hover. */
  dropdown?.addEventListener('mouseenter', () => abrirDropdown(true));
  dropdown?.addEventListener('mouseleave', () => abrirDropdown(false));
} else {
  dropdownBtn?.addEventListener('click', () => abrirDropdown(!dropdown.classList.contains('is-open')));
}
document.addEventListener('click', (event) => {
  if (dropdown && !dropdown.contains(event.target)) abrirDropdown(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') abrirDropdown(false);
});
dropdown?.querySelectorAll('.nav__menu a').forEach((link) => {
  link.addEventListener('click', () => abrirDropdown(false));
});

/* 4. Carrossel de "Como funciona": abas, setas e pontos controlam o mesmo índice */
const track = document.querySelector('[data-track]');
if (track) {
  const cards = [...track.querySelectorAll('.how__card')];
  const tabs = [...document.querySelectorAll('.how__tab')];
  const dots = [...document.querySelectorAll('[data-dots] button')];
  const btnPrev = document.querySelector('[data-prev]');
  const btnNext = document.querySelector('[data-next]');
  let atual = 0;
  const irPara = (indice) => {
    atual = Math.max(0, Math.min(indice, cards.length - 1));
    track.style.setProperty('--i', atual);
    cards.forEach((card, i) => card.classList.toggle('is-active', i === atual));
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === atual));
    tabs.forEach((tab, i) => {
      tab.classList.toggle('is-active', i === atual);
      tab.setAttribute('aria-selected', String(i === atual));
    });
    btnPrev.disabled = atual === 0;
    btnNext.disabled = atual === cards.length - 1;
  };
  tabs.forEach((tab, i) => tab.addEventListener('click', () => irPara(i)));
  dots.forEach((dot, i) => dot.addEventListener('click', () => irPara(i)));
  btnPrev?.addEventListener('click', () => irPara(atual - 1));
  btnNext?.addEventListener('click', () => irPara(atual + 1));

  /* Arrastar com o mouse ou com o dedo: o trilho acompanha o movimento e,
     ao soltar, encaixa no card mais próximo. */
  let arrastando = false;
  let inicioX = 0;
  let desloc = 0;

  /* Medido no próprio card: variáveis CSS com min() e calc() não voltam
     resolvidas em getComputedStyle. */
  const larguraPasso = () => {
    const espaco = parseFloat(getComputedStyle(track).columnGap) || 0;
    return cards[0].getBoundingClientRect().width + espaco;
  };

  track.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    arrastando = true;
    desloc = 0;
    inicioX = event.clientX;
    track.setPointerCapture(event.pointerId);
    track.style.transition = 'none';
    track.classList.add('is-dragging');
  });

  track.addEventListener('pointermove', (event) => {
    if (!arrastando) return;
    desloc = event.clientX - inicioX;
    /* Resistência nas pontas, para o trilho não sair voando */
    if ((atual === 0 && desloc > 0) || (atual === cards.length - 1 && desloc < 0)) desloc *= 0.32;
    track.style.transform = `translateX(${atual * larguraPasso() * -1 + desloc}px)`;
  });

  const soltar = () => {
    if (!arrastando) return;
    arrastando = false;
    track.classList.remove('is-dragging');
    track.style.transition = '';
    track.style.transform = '';

    const limite = Math.min(120, larguraPasso() * 0.14);
    if (desloc <= -limite) irPara(atual + 1);
    else if (desloc >= limite) irPara(atual - 1);
  };

  track.addEventListener('pointerup', soltar);
  track.addEventListener('pointercancel', soltar);
  track.addEventListener('dragstart', (event) => event.preventDefault());

  irPara(0);
}

/* 5. Depoimentos: deslizam sozinhos e também no clique e no arraste */
const quotesBox = document.querySelector('[data-quotes]');
if (quotesBox) {
  const quotes = [...quotesBox.querySelectorAll('.voices__quote')];
  const qDots = [...document.querySelectorAll('[data-quote-dots] button')];
  const btnPause = document.querySelector('[data-quote-pause]');
  const iconePausa = '<path d="M5.5 3.5v9M10.5 3.5v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  const iconePlay = '<path d="M5.5 3.2l7 4.8-7 4.8z" fill="currentColor"/>';
  let atualQuote = 0;
  let timer = null;

  const mostrarQuote = (indice) => {
    atualQuote = (indice + quotes.length) % quotes.length;
    quotesBox.style.setProperty('--q', atualQuote);
    qDots.forEach((d, i) => d.classList.toggle('is-active', i === atualQuote));
  };

  const tocar = () => {
    if (timer) return;
    timer = setInterval(() => mostrarQuote(atualQuote + 1), 6000);
    btnPause.querySelector('svg').innerHTML = iconePausa;
    btnPause.setAttribute('aria-label', 'Pausar depoimentos');
  };

  const pausar = () => {
    clearInterval(timer);
    timer = null;
    btnPause.querySelector('svg').innerHTML = iconePlay;
    btnPause.setAttribute('aria-label', 'Retomar depoimentos');
  };

  /* Toda interação reinicia a contagem, para o slide não trocar no meio da leitura */
  const reiniciarRelogio = () => { if (timer) { pausar(); tocar(); } };

  btnPause?.addEventListener('click', () => (timer ? pausar() : tocar()));
  qDots.forEach((dot, i) => {
    dot.addEventListener('click', () => { mostrarQuote(i); reiniciarRelogio(); });
  });

  /* Arraste: acompanha o dedo e encaixa no slide mais próximo ao soltar */
  let puxando = false;
  let iniQ = 0;
  let dQ = 0;

  quotesBox.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    puxando = true;
    dQ = 0;
    iniQ = event.clientX;
    quotesBox.setPointerCapture(event.pointerId);
    quotesBox.style.transition = 'none';
  });

  quotesBox.addEventListener('pointermove', (event) => {
    if (!puxando) return;
    dQ = event.clientX - iniQ;
    const largura = quotesBox.getBoundingClientRect().width;
    quotesBox.style.transform = `translateX(${atualQuote * largura * -1 + dQ}px)`;
  });

  const soltarQuote = () => {
    if (!puxando) return;
    puxando = false;
    quotesBox.style.transition = '';
    quotesBox.style.transform = '';

    const limite = Math.min(110, quotesBox.getBoundingClientRect().width * 0.12);
    if (dQ <= -limite) mostrarQuote(atualQuote + 1);
    else if (dQ >= limite) mostrarQuote(atualQuote - 1);
    reiniciarRelogio();
  };

  quotesBox.addEventListener('pointerup', soltarQuote);
  quotesBox.addEventListener('pointercancel', soltarQuote);
  quotesBox.addEventListener('dragstart', (event) => event.preventDefault());

  mostrarQuote(0);
  tocar();
}

/* 6. Revelar elementos ao rolar */
const revelaveis = new Set(document.querySelectorAll('.reveal'));
const revelar = (el, atraso = 0) => {
  if (!revelaveis.has(el)) return;
  revelaveis.delete(el);
  revealObserver.unobserve(el);
  setTimeout(() => el.classList.add('is-visible'), atraso);
};
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) revelar(entry.target, i * 60);
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px' }
);
revelaveis.forEach((el) => revealObserver.observe(el));
/* Rede de segurança: rolagens muito rápidas ou saltos por âncora podem passar
   direto pelo observer e deixar blocos invisíveis. Aqui varremos o que já
   entrou na tela e liberamos na hora. */
let varreduraAgendada = false;
const varrerVisiveis = () => {
  varreduraAgendada = false;
  revelaveis.forEach((el) => {
    const { top, bottom } = el.getBoundingClientRect();
    if (top < window.innerHeight - 40 && bottom > 0) revelar(el);
  });
};
const agendarVarredura = () => {
  if (varreduraAgendada) return;
  varreduraAgendada = true;
  requestAnimationFrame(varrerVisiveis);
};
window.addEventListener('scroll', agendarVarredura, { passive: true });
window.addEventListener('resize', agendarVarredura, { passive: true });
agendarVarredura();

/* 7. Contadores numéricos */
const animateCount = (el) => {
  const target = Number(el.dataset.count || 0);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const duration = 1200;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = prefix + Math.round(target * eased) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.6 }
);
document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));

/* 8. Ano do rodapé sempre atual */
const anoAtual = new Date().getFullYear();
const rodape = document.querySelector('.footer__bottom p');
if (rodape) rodape.textContent = `© ${anoAtual} Weknow Healthtech · Todos os direitos reservados`;
