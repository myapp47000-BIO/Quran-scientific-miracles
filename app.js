/* =========================================================================
   الإعجاز العلمي في القرآن الكريم — منطق التطبيق (App Logic)
   ========================================================================= */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const LS_FAV = 'qsm_favorites_v1';
  const LS_THEME = 'qsm_theme_v1';
  const LS_AUDIO = 'qsm_audio_v1';

  const state = {
    tab: 'home',
    search: '',
    category: 'all',
    termCat: 'all',
    termSearch: '',
    scholarKind: 'all',
    favorites: new Set(loadJSON(LS_FAV, [])),
    quiz: { order: [], index: 0, score: 0, answered: false }
  };

  /* ----------------------------- helpers ----------------------------- */
  function el(tag, attrs = {}, html) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    if (html != null) node.innerHTML = html;
    return node;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function loadJSON(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function categoryOf(id) { return CATEGORIES.find((c) => c.id === id) || { name: 'عام', icon: '✦', color: '#888' }; }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false; t.style.animation = 'none';
    requestAnimationFrame(() => (t.style.animation = 'fade .2s ease'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 1900);
  }

  /* ------------------------------- Theme ------------------------------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = $('#themeBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
      btn.setAttribute('title', theme === 'light' ? 'التبديل إلى الوضع الليلي' : 'التبديل إلى الوضع النهاري');
    }
    saveJSON(LS_THEME, theme);
  }
  function initTheme() {
    const saved = loadJSON(LS_THEME, null);
    const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    applyTheme(saved || prefers);
  }

  /* ------------------------------- Tabs ------------------------------- */
  const TABS = [
    { id: 'home', label: '🏠 الرئيسية' },
    { id: 'miracies', label: '📖 آيات الإعجاز' },
    { id: 'categories', label: '🗂️ المجالات' },
    { id: 'similar', label: '🕸️ المتشابهات' },
    { id: 'terms', label: '📚 فهرس المصطلحات' },
    { id: 'scholars', label: '👨‍🔬 العلماء والمستشرقون' },
    { id: 'advances', label: '🚀 التطورات العلمية' },
    { id: 'timeline', label: '🕰️ الجدول الزمني' },
    { id: 'youtube', label: '▶️ قنوات يوتيوب' },
    { id: 'quiz', label: '🏆 مسابقات ثقافية' },
    { id: 'favorites', label: '⭐ المفضلة' },
    { id: 'references', label: '📚 مراجع وأبحاث' }
  ];
  function renderTabs() {
    const nav = $('#tabs');
    nav.innerHTML = '';
    TABS.forEach((t) => {
      nav.appendChild(el('button', {
        class: 'tab' + (state.tab === t.id ? ' active' : ''),
        onclick: () => setTab(t.id)
      }, t.label));
    });
  }
  function setTab(id) {
    state.tab = id;
    if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
    renderTabs();
    renderSideMenu();
    renderView();
    $('#view').focus({ preventScroll: true });
  }

  /* ------------------------------ القائمة الجانبية ------------------------------ */
  function renderSideMenu() {
    const nav = $('#sideNav');
    if (!nav) return;
    nav.innerHTML = '';
    TABS.forEach((t) => {
      nav.appendChild(el('button', {
        class: 'side-item' + (state.tab === t.id ? ' active' : ''),
        type: 'button',
        onclick: () => { setTab(t.id); closeSideMenu(); }
      }, t.label));
    });
  }
  function openSideMenu() {
    const menu = $('#sideMenu');
    const btn = $('#menuBtn');
    if (!menu) return;
    renderSideMenu();
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('open'));
    if (btn) btn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }
  function closeSideMenu() {
    const menu = $('#sideMenu');
    const btn = $('#menuBtn');
    if (!menu) return;
    menu.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    setTimeout(() => { menu.hidden = true; }, 220);
  }
  function initSideMenu() {
    const btn = $('#menuBtn');
    const menu = $('#sideMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => {
      if (menu.hidden || !menu.classList.contains('open')) openSideMenu();
      else closeSideMenu();
    });
    menu.querySelector('[data-menu-close]').addEventListener('click', closeSideMenu);
    const closeBtn = $('#menuClose');
    if (closeBtn) closeBtn.addEventListener('click', closeSideMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) closeSideMenu();
    });
    renderSideMenu();
  }

  /* ------------------------------ Router ------------------------------ */
  function initRouter() {
    const applyHash = () => {
      const h = location.hash.slice(1);
      if (TABS.some((t) => t.id === h)) state.tab = h;
      renderTabs();
      renderView();
    };
    window.addEventListener('hashchange', applyHash);
    applyHash();
  }

  /* ------------------------------- Views ------------------------------- */
  function renderView() {
    const view = $('#view');
    view.innerHTML = '';
    switch (state.tab) {
      case 'home': return viewHome(view);
      case 'miracies': return viewMiracles(view);
      case 'categories': return viewCategories(view);
      case 'similar': return viewSimilar(view);
      case 'terms': return viewTerms(view);
      case 'scholars': return viewScholars(view);
      case 'advances': return viewAdvances(view);
      case 'timeline': return viewTimeline(view);
      case 'youtube': return viewYoutube(view);
      case 'quiz': return viewQuiz(view);
      case 'favorites': return viewFavorites(view);
      case 'references': return viewReferences(view);
    }
  }

  /* ---- Home ---- */
  function viewHome(view) {
    const hero = el('section', { class: 'hero' });
    hero.innerHTML = `
      <span class="hero-badge">۞ ${esc(APP_META.title)}</span>
      <h2 class="ayah">﴿سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ حَتَّىٰ يَتَبَيَّنَ لَهُمْ أَنَّهُ الْحَقُّ﴾</h2>
      <p class="ayah-ref">سورة فصلت — الآية 53</p>
      <p>موسوعة تفاعلية تعرض آيات الإعجاز العلمي في المجالات المختلفة، مع التفسير ودلالات الإعجاز، وشهادات العلماء، والمراجع والبحوث العلمية، والحِكَم والتطبيقات.</p>
      <div class="btn-row">
        <button class="btn primary" id="goMiracles">تصفّح الآيات</button>
        <button class="btn" id="goSimilar">🕸️ المتشابهات</button>
        <button class="btn" id="goQuiz">🏆 المسابقات الثقافية</button>
        <button class="btn" id="goScholars">العلماء والمستشرقون</button>
        <button class="btn" id="goInstall">⤓ تثبيت التطبيق</button>
      </div>`;
    view.appendChild(hero);
    $('#goMiracles', hero).onclick = () => setTab('miracies');
    $('#goSimilar', hero).onclick = () => setTab('similar');
    $('#goQuiz', hero).onclick = () => setTab('quiz');
    $('#goScholars', hero).onclick = () => setTab('scholars');
    $('#goInstall', hero).onclick = () => showInstallHelp();

    const stats = el('div', { class: 'stats' });
    stats.innerHTML = `
      <div class="stat"><b>${MIRACLES.length}</b><span>آية إعجاز موثّقة</span></div>
      <div class="stat"><b>${CATEGORIES.length}</b><span>مجالات علمية</span></div>
      <div class="stat"><b>${SCHOLARS.length}</b><span>عالِم ومستشرق</span></div>
      <div class="stat"><b>${REFERENCES.length + ACADEMIC_RESEARCH.length}</b><span>مرجع وبحث علمي</span></div>`;
    view.appendChild(stats);

    view.appendChild(el('h3', { class: 'section-title' }, 'المجالات العلمية'));
    view.appendChild(el('p', { class: 'section-desc' }, 'اختر مجالًا لتصفح آياته ودلالات الإعجاز فيه.'));
    view.appendChild(categoryGrid());

    view.appendChild(el('h3', { class: 'section-title' }, 'أحدث الآيات المضافة'));
    const grid = el('div', { class: 'grid' });
    MIRACLES.slice(-6).reverse().forEach((m) => grid.appendChild(miracleCard(m)));
    view.appendChild(grid);

    view.appendChild(el('h3', { class: 'section-title' }, 'ضوابط منهجية'));
    const ins = el('div', { class: 'rows' });
    KEY_INSIGHTS.forEach((k) => {
      ins.appendChild(el('div', { class: 'row' }, `<h3>${esc(k.title)}</h3><p>${esc(k.text)}</p>`));
    });
    view.appendChild(ins);
  }

  /* ---- Categories ---- */
  function categoryGrid() {
    const g = el('div', { class: 'grid' });
    CATEGORIES.forEach((c) => {
      const count = MIRACLES.filter((m) => m.category === c.id).length;
      const card = el('article', {
        class: 'card',
        onclick: () => { state.category = c.id; state.search = ''; $('#search').value = ''; setTab('miracies'); }
      });
      card.innerHTML = `
        <div class="card-head">
          <div class="card-ico" style="background:${c.color}22;color:${c.color}">${c.icon}</div>
          <div><div class="card-title">${esc(c.name)}</div><div class="card-cat">${count} آية</div></div>
        </div>
        <p style="margin:0;color:var(--text-dim);font-size:13.5px">تصفّح آيات ${esc(c.name)} ودلالات الإعجاز فيها.</p>`;
      g.appendChild(card);
    });
    return g;
  }
  function viewCategories(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'المجالات العلمية'));
    view.appendChild(el('p', { class: 'section-desc' }, 'الإعجاز العلمي ينتشر في مجالات متعددة؛ اختر مجالًا لعرض آياته.'));
    view.appendChild(categoryGrid());
  }

  /* ---- Miracles ---- */
  function filteredMiracles() {
    const q = state.search.trim().toLowerCase();
    return MIRACLES.filter((m) => {
      if (state.category !== 'all' && m.category !== state.category) return false;
      if (!q) return true;
      const hay = [m.title, m.verse, m.verseRef, m.interpretation, m.miracleSign,
        (m.keywords || []).join(' '), (m.tags || []).join(' '),
        (m.scientists || []).map((s) => s.name + ' ' + s.text).join(' ')].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  function viewMiracles(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'آيات الإعجاز العلمي'));
    view.appendChild(el('p', { class: 'section-desc' }, 'اضغط على أي بطاقة لعرض التفسير ودلالات الإعجاز والشهادات والمراجع.'));

    const filters = el('div', { class: 'filters' });
    const allChip = el('button', { class: 'chip' + (state.category === 'all' ? ' active' : ''), onclick: () => { state.category = 'all'; renderView(); } }, `الكل (${MIRACLES.length})`);
    filters.appendChild(allChip);
    CATEGORIES.forEach((c) => {
      const n = MIRACLES.filter((m) => m.category === c.id).length;
      filters.appendChild(el('button', {
        class: 'chip' + (state.category === c.id ? ' active' : ''),
        onclick: () => { state.category = c.id; renderView(); }
      }, `${c.icon} ${c.name} (${n})`));
    });
    view.appendChild(filters);

    const list = filteredMiracles();
    view.appendChild(el('div', { class: 'result-count' }, `النتائج: ${list.length} آية`));

    if (!list.length) { view.appendChild(el('div', { class: 'empty' }, 'لا توجد نتائج مطابقة. جرّب كلمة أخرى.')); return; }
    const grid = el('div', { class: 'grid' });
    list.forEach((m) => grid.appendChild(miracleCard(m)));
    view.appendChild(grid);
  }
  function miracleCard(m) {
    const c = categoryOf(m.category);
    const card = el('article', { class: 'card', tabindex: '0', role: 'button', onclick: () => openMiracle(m.id), onkeydown: (e) => { if (e.key === 'Enter') openMiracle(m.id); } });
    const tags = (m.keywords || []).slice(0, 3).map((k) => `<span class="tag">${esc(k)}</span>`).join('');
    card.innerHTML = `
      <div class="card-head">
        <div class="card-ico" style="background:${c.color}22;color:${c.color}">${c.icon}</div>
        <div><div class="card-cat">${esc(c.name)}</div><div class="card-title">${esc(m.title)}</div></div>
      </div>
      <div class="card-ayah">﴿${esc(m.verse)}﴾</div>
      <div class="card-ref">${esc(m.verseRef)}</div>
      <div class="card-tags">${tags}</div>`;
    return card;
  }

  /* ---- المتشابهات: آيات تكررت فيها الدلالة ---- */
  function viewSimilar(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'المتشابهات — آيات تجمّعها دلالة واحدة'));
    view.appendChild(el('p', { class: 'section-desc' }, 'آيات من سور مختلفة تحمل نفس الدلالة والمعنى في القرآن الكريم؛ مثل تثبيت الأرض بالجبال، والبرزخ بين البحرين، وتدرّج خلق الجنين. اضغط على البطاقة لاستعراض الآيات.'));

    const grid = el('div', { class: 'sim-grid' });
    SIMILAR_VERSES.forEach((g) => {
      const card = el('article', { class: 'sim-card' });
      const h = el('div', { class: 'sim-head' });
      h.innerHTML = `<span class="tag">${esc(g.theme)}</span><h4>${esc(g.title)}</h4><p>${esc(g.summary)}</p>`;
      card.appendChild(h);
      const list = el('div', { class: 'sim-verses' });
      g.verses.forEach((v) => {
        const it = el('div', { class: 'sim-verse' });
        it.innerHTML = `
          <div class="card-ayah">﴿${esc(v.text.replace(/﴿|﴾/g, '').trim())}﴾</div>
          <div class="sim-meta"><span class="card-ref">${esc(v.ref)}</span><span class="sim-note">${esc(v.note)}</span></div>`;
        list.appendChild(it);
      });
      card.appendChild(list);
      grid.appendChild(card);
    });
    view.appendChild(grid);
  }

  /* ---- فهرس المصطلحات القرآنية ---- */
  function viewTerms(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'فهرس المصطلحات القرآنية وتفسيرها'));
    view.appendChild(el('p', { class: 'section-desc' }, 'معانٍ موجزة لمصطلحات قرآنية شائعة مع تفسير مفصّل ومرجع من الآيات. اضغط «التفسير المفصّل» لعرض الشرح.'));

    const searchBox = el('div', { class: 'term-search' });
    const inp = el('input', { type: 'search', placeholder: 'ابحث في المصطلحات…', 'aria-label': 'بحث في المصطلحات', value: state.termSearch });
    const clearBtn = el('button', { class: 'clear-btn', 'aria-label': 'مسح البحث', hidden: !state.termSearch }, '✕');
    searchBox.appendChild(inp);
    searchBox.appendChild(clearBtn);
    view.appendChild(searchBox);

    const filters = el('div', { class: 'filters' });
    filters.appendChild(el('button', { class: 'chip' + (state.termCat === 'all' ? ' active' : ''), onclick: () => { state.termCat = 'all'; renderView(); } }, `الكل (${TERMS.length})`));
    TERM_CATEGORIES.forEach((c) => {
      const cnt = TERMS.filter((t) => t.cat === c.id).length;
      filters.appendChild(el('button', { class: 'chip' + (state.termCat === c.id ? ' active' : ''), onclick: () => { state.termCat = c.id; renderView(); } }, `${c.icon} ${c.name} (${cnt})`));
    });
    view.appendChild(filters);

    const count = el('div', { class: 'result-count' }, '');
    view.appendChild(count);

    const filtered = TERMS.filter((t) => state.termCat === 'all' || t.cat === state.termCat);
    const grid = el('div', { class: 'terms-grid' });

    function norm(s) { return (s || '').toLowerCase(); }

    const cards = filtered.map((t) => {
      const cat = TERM_CATEGORIES.find((x) => x.id === t.cat) || { name: '', icon: '' };
      const detail = TERM_DETAILS[t.term] || '';
      const card = el('article', { class: 'term-card' });
      const hay = norm([t.term, t.meaning, t.ref, detail, cat.name].join(' '));
      card.dataset.search = hay;
      card.innerHTML = `
        <div class="term-head">
          <span class="term-ico">${cat.icon}</span>
          <h4 class="term-title">${esc(t.term)}</h4>
          <span class="term-cat">${esc(cat.name)}</span>
        </div>
        <p class="term-mean">${esc(t.meaning)}</p>
        ${t.ref ? `<p class="term-ref">${esc(t.ref)}</p>` : ''}
        ${detail ? `<button class="term-more" type="button" aria-expanded="false">التفسير المفصّل <span class="term-more-ico">▾</span></button>
        <div class="term-detail" hidden><p>${esc(detail)}</p></div>` : ''}`;
      grid.appendChild(card);
      return card;
    });
    view.appendChild(grid);

    function applyFilter() {
      const q = norm(state.termSearch).trim();
      let shown = 0;
      cards.forEach((c) => {
        const ok = !q || c.dataset.search.includes(q);
        c.hidden = !ok;
        if (ok) shown++;
      });
      count.textContent = `النتائج: ${shown} مصطلح`;
    }
    applyFilter();

    inp.addEventListener('input', () => {
      state.termSearch = inp.value;
      clearBtn.hidden = !inp.value;
      applyFilter();
    });
    clearBtn.addEventListener('click', () => {
      inp.value = ''; state.termSearch = ''; clearBtn.hidden = true; applyFilter(); inp.focus();
    });

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.term-more');
      if (!btn) return;
      const box = btn.nextElementSibling;
      const open = box.hidden;
      box.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.classList.toggle('open', open);
    });
  }

  /* ---- Scientists ---- */
  function viewScholars(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'العلماء والمستشرقون المهتمون بالإعجاز'));
    view.appendChild(el('p', { class: 'section-desc' }, 'علماء مسلمون، وعلماء غربيون، ومستشرقون، ومن أسلموا بسبب الإعجاز. اضغط للتفاصيل.'));

    const kinds = [
      { id: 'all', label: 'الكل' },
      { id: 'scientist', label: '🔬 علماء' },
      { id: 'scholar', label: '📗 علماء شرعيون' },
      { id: 'convert', label: '↩️ أسلموا بسبب الإعجاز' },
      { id: 'orientalist', label: '🌍 مستشرقون/غربيون' }
    ];
    const filters = el('div', { class: 'filters' });
    kinds.forEach((k) => filters.appendChild(el('button', {
      class: 'chip' + (state.scholarKind === k.id ? ' active' : ''),
      onclick: () => { state.scholarKind = k.id; renderView(); }
    }, k.label)));
    view.appendChild(filters);

    const list = SCHOLARS.filter((s) => state.scholarKind === 'all' || s.kind === state.scholarKind);
    const rows = el('div', { class: 'rows' });
    list.forEach((s) => {
      const kindLabel = { scientist: 'عالم', scholar: 'عالم شرعي', convert: 'أسلم بسبب الإعجاز', orientalist: 'مستشرق/غربي' }[s.kind] || '';
      rows.appendChild(el('div', { class: 'row' },
        `<h3>${esc(s.name)} <span class="tag">${esc(kindLabel)}</span></h3>
         <p class="role">${esc(s.nameEn)} — ${esc(s.field)}</p>
         <p>${esc(s.role)}</p>
         ${s.contribution ? `<p><b>الإسهام:</b> ${esc(s.contribution)}</p>` : ''}
         ${(s.works && s.works.length) ? `<p class="meta"><b>أعمال:</b> ${s.works.map(esc).join(' · ')}</p>` : ''}
         ${s.note ? `<p class="meta">ملاحظة: ${esc(s.note)}</p>` : ''}`));
    });
    view.appendChild(rows);
  }

  /* ---- Advances ---- */
  function viewAdvances(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'أبرز التطورات العلمية المرتبطة بالآيات'));
    view.appendChild(el('p', { class: 'section-desc' }, 'أوجه التأثير والاستفادة العلمية والبحثية التي جرى ربطها بآيات الإعجاز.'));
    const rows = el('div', { class: 'rows' });
    ADVANCES.forEach((a) => rows.appendChild(el('div', { class: 'row' },
      `<h3>${esc(a.title)}</h3><p>${esc(a.text)}</p>`)));
    view.appendChild(rows);

    view.appendChild(el('h3', { class: 'section-title' }, 'شهادات واقتباسات'));
    const quotes = el('div', { class: 'rows' });
    MIRACLES.forEach((m) => (m.scientists || []).forEach((s) => {
      quotes.appendChild(el('div', { class: 'row' },
        `<h3>${esc(s.name)}</h3><p class="meta">${esc(s.title || '')} ${s.source ? '— ' + esc(s.source) : ''}</p><p>${esc(s.text)}</p>`));
    }));
    view.appendChild(quotes);
  }

  /* ---- Timeline ---- */
  function viewTimeline(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'الجدول الزمني'));
    view.appendChild(el('p', { class: 'section-desc' }, 'محطات في تاريخ الإعجاز العلمي والمقارنة بين القرآن والعلم.'));
    const tl = el('div', { class: 'timeline' });
    TIMELINE.forEach((t) => tl.appendChild(el('div', { class: 'tl-item' },
      `<div class="tl-year">${esc(t.year)}</div><div class="tl-text">${esc(t.text)}</div>`)));
    view.appendChild(tl);
  }

  /* ---- Quiz ---- */
  /* ---- مسابقة ثقافية: من يربح المليون ---- */
  const PRIZES = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
  const SAFE = new Set([1000, 32000]);
  const AR = ['أ', 'ب', 'ج', 'د'];
  const fmt = (n) => (n || 0).toLocaleString('en-US');

  function startMillionaire(box, compId) {
    const comp = COMPETITIONS.find((c) => c.id === compId) || COMPETITIONS[0];
    let pool = QUIZ_MILLIONAIRE.map((_, i) => i);
    if (comp.id !== 'general') pool = pool.filter((i) => QUIZ_MILLIONAIRE[i].cat === comp.id);
    pool = pool.sort(() => Math.random() - 0.5).slice(0, PRIZES.length);
    state.quiz = {
      kind: 'million',
      comp: comp.id,
      compIcon: comp.icon,
      compTitle: comp.title,
      order: pool,
      index: 0,
      held: 0,
      secured: 0,
      lifeline: { fifty: true, audience: true, friend: true, reRoll: true },
      answered: false,
      finished: false
    };
    renderMillionaire(box);
  }

  function renderCompetitionFinder(box) {
    box.innerHTML = '';
    const grid = el('div', { class: 'comp-grid' });
    COMPETITIONS.forEach((c) => {
      const count = c.id === 'general'
        ? QUIZ_MILLIONAIRE.length
        : QUIZ_MILLIONAIRE.filter((q) => q.cat === c.id).length;
      const card = el('article', { class: 'comp-card' });
      card.innerHTML = `
        <div class="comp-ico">${c.icon}</div>
        <h4>${esc(c.title)}</h4>
        <p>${esc(c.desc)}</p>
        <span class="tag">${count} سؤالًا</span>`;
      const row = el('div', { class: 'btn-row' });
      row.appendChild(el('button', { class: 'btn primary', type: 'button', onclick: () => startMillionaire(box, c.id) }, '🎬 ابدأ المسابقة'));
      card.appendChild(row);
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  function renderMillionaire(box) {
    box.innerHTML = '';
    const { order, index } = state.quiz;
    const level = Math.min(index, PRIZES.length - 1);
    const q = QUIZ_MILLIONAIRE[order[index]];

    const wrap = el('div', { class: 'million-wrap' });
    box.appendChild(wrap);

    // شريط علوي: الرجوع للقائمة + اسم المسابقة
    const cbar = el('div', { class: 'comp-bar' });
    const back = el('button', { class: 'btn btn-sm', type: 'button', onclick: () => setTab('quiz') }, '🏟️ قائمة المسابقات');
    cbar.appendChild(back);
    cbar.appendChild(el('span', { class: 'comp-name' }, `${state.quiz.compIcon} ${esc(state.quiz.compTitle)}`));
    wrap.appendChild(cbar);

    // سُلّم الجوائز
    const ladder = el('aside', { class: 'ladder-group' });
    ladder.appendChild(el('div', { class: 'ladder-top' },
      '<button class="btn ladder-toggle" type="button">🏅 المستويات</button>'));
    const lList = el('ul', { class: 'ladder-list' });
    for (let i = PRIZES.length - 1; i >= 0; i--) {
      const li = el('li');
      li.textContent = fmt(PRIZES[i]);
      if (i === level) li.className = 'is-current';
      else if (PRIZES[i] <= state.quiz.secured) li.className = 'is-secured';
      else if (i < level) li.className = 'is-passed';
      lList.appendChild(li);
    }
    ladder.appendChild(lList);
    wrap.appendChild(ladder);

    // منطقة اللعب
    const game = el('section', { class: 'game' });
    const head = el('div', { class: 'game-head' });
    head.innerHTML = `
      <div class="level-badge">السؤال ${index + 1} من ${PRIZES.length}</div>
      <div class="prize-badge">💰 ${fmt(PRIZES[level])}</div>
      <div class="secured-badge">مضمون: ${fmt(state.quiz.secured)}</div>`;
    game.appendChild(head);

    const qcard = el('div', { class: 'qcard' });
    qcard.appendChild(el('p', { class: 'qcard-q' }, esc(q.q)));
    const panel = el('div', { class: 'life-panel', hidden: 'hidden' });
    qcard.appendChild(panel);
    game.appendChild(qcard);

    const opts = el('div', { class: 'opts' });
    q.options.forEach((opt, i) => {
      const b = el('button', { class: 'opt', type: 'button' },
        `<span class="opt-letter">${AR[i]}</span><span>${esc(opt)}</span>`);
      b.onclick = () => answerMillion(box, q, i, b);
      opts.appendChild(b);
    });
    game.appendChild(opts);

    const life = el('div', { class: 'lifelines' });
    game.appendChild(life);

    const act = el('div', { class: 'btn-row' });
    act.appendChild(el('button', { class: 'btn', type: 'button',
      onclick: () => finishMillion(box, 'walk') }, '🏃 خروج بمكسبي (' + fmt(state.quiz.held) + ')'));
    game.appendChild(act);
    wrap.appendChild(game);

    // ربط الحالة
    box.__lifePanel = panel;
    box.__life = life;
    box.__ladder = ladder;
    $('.ladder-toggle', ladder).onclick = () => ladder.classList.toggle('is-open');
    renderLifelines(box);
  }

  function renderLifelines(box) {
    const life = box.__life;
    if (!life) return;
    const L = state.quiz.lifeline;
    const defs = [
      ['fifty', '50:50', 'حذف إجابتين خاطئتين'],
      ['audience', '👥 الجمهور', 'استشارة الجمهور'],
      ['friend', '📞 صديق', 'الاتصال بصديق خبير'],
      ['reRoll', '🔄 تغيير السؤال', 'استبدال السؤال الحالي بسؤال آخر']
    ];
    life.innerHTML = '';
    defs.forEach(([key, label, note]) => {
      const used = !L[key];
      const b = el('button', { class: 'life' + (used ? ' used' : ''), type: 'button', title: note, disabled: used });
      b.textContent = used ? label + ' ✕' : label;
      life.appendChild(b);
      if (used) return;
      b.onclick = () => lifelineAction(box, key);
    });
  }

  function lifelineAction(box, key) {
    const g = state.quiz;
    if (g.answered || g.finished || !g.lifeline[key]) return;
    const q = QUIZ_MILLIONAIRE[g.order[g.index]];
    const panel = box.__lifePanel;

    if (key === 'fifty') {
      g.lifeline.fifty = false;
      const wrongIdx = q.options.map((_, i) => i).filter((i) => i !== q.answer);
      wrongIdx.sort(() => Math.random() - 0.5).slice(0, 2).forEach((i) => {
        const o = $$('.opt', box)[i];
        if (o) { o.classList.add('removed'); o.disabled = true; }
      });
      toast('أُلغيت إجابتان ✌️');
      renderLifelines(box);
    }

    if (key === 'audience') {
      g.lifeline.audience = false;
      panel.hidden = false;
      panel.innerHTML = '<div class="panel-title">نتيجة استشارة الجمهور 👥</div>';
      const idx = g.index;
      const correctPct = Math.max(30, 66 - idx);
      const others = q.options.map(() => 0);
      const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer);
      const rem = 100 - correctPct;
      const w = wrong.map(() => Math.floor(Math.random() * (rem / wrong.length) + rem / wrong.length / 2));
      const wSum = w.reduce((a, b) => a + b, 1);
      wrong.forEach((wi, k) => { others[wi] = Math.round((w[k] / wSum) * rem); });
      others[q.answer] = 100 - others.reduce((a, b) => a + b, 0);
      q.options.forEach((_, i) => {
        const bar = el('div', { class: 'aud-row' });
        bar.innerHTML = `<span class="aud-letter">${AR[i]}</span>
          <span class="aud-bar"><i style="width:${others[i]}%"></i></span>
          <span class="aud-pct">${others[i]}%</span>`;
        panel.appendChild(bar);
      });
      renderLifelines(box);
    }

    if (key === 'friend') {
      g.lifeline.friend = false;
      panel.hidden = false;
      const rel = Math.max(0.6, 0.95 - g.index * 0.02);
      let choice = q.answer;
      if (Math.random() > rel) choice = q.options.map((_, i) => i).filter((i) => i !== q.answer)[0];
      panel.innerHTML = `<div class="friend-note">📞 صديقك الخبير يرجّح:<br>
        <b>«${AR[choice]}) ${esc(q.options[choice])}»</b>
        <span class="friend-rel">(ثقة تقريبية: ${Math.round(rel * 100)}٪)</span></div>`;
      renderLifelines(box);
    }

    if (key === 'reRoll') {
      if (g.index >= PRIZES.length - 1) { toast('لا يمكن تغيير السؤال الأخير'); return; }
      g.lifeline.reRoll = false;
      const j = g.index + 1 + Math.floor(Math.random() * (PRIZES.length - g.index - 1));
      [g.order[g.index], g.order[j]] = [g.order[j], g.order[g.index]];
      toast('تم تغيير السؤال 🔄');
      renderMillionaire(box);
    }
  }

  function answerMillion(box, q, chosen, btn) {
    const g = state.quiz;
    if (g.finished || g.answered) return;
    g.answered = true;
    const opts = $$('.opt', box);
    opts.forEach((o, i) => { if (i === q.answer && !o.disabled) o.classList.add('correct'); });
    if (chosen !== q.answer) btn.classList.add('wrong');

    const panel = box.__lifePanel;
    panel.hidden = false;
    panel.innerHTML = '';
    panel.appendChild(el('div', { class: 'explain' }, esc(q.explain)));

    const correct = chosen === q.answer;
    if (correct) {
      const lvl = Math.min(g.index, PRIZES.length - 1);
      g.held = PRIZES[lvl];
      if (SAFE.has(PRIZES[lvl])) g.secured = PRIZES[lvl];
      if (g.index >= PRIZES.length - 1) { finishMillion(box, 'million'); return; }
      const row = el('div', { class: 'btn-row' });
      row.appendChild(el('button', { class: 'btn primary', type: 'button',
        onclick: () => { g.index++; g.answered = false; renderMillionaire(box); } }, 'السؤال التالي ←'));
      row.appendChild(el('button', { class: 'btn', type: 'button',
        onclick: () => finishMillion(box, 'walk') }, 'توقف عند ' + fmt(g.held)));
      panel.appendChild(row);
    } else {
      setTimeout(() => finishMillion(box, 'wrong'), 900);
    }
  }

  function finishMillion(box, kind) {
    const g = state.quiz;
    if (g.finished) return;
    g.finished = true;
    let title, sub, icon = '💰';
    if (kind === 'million') {
      title = 'مليونير! 🏆';
      sub = 'أجبت عن جميع الأسئلة وحققت «المليون» في الإعجاز العلمي. مبارك!';
      icon = '🏆';
    } else if (kind === 'walk') {
      title = 'انسحاب آمن 🏃';
      sub = 'قررت التوقف. خرجت بمكسبك: ' + fmt(g.held) + ' (المضمون: ' + fmt(g.secured) + ').';
    } else {
      title = 'إجابة خاطئة 😅';
      sub = 'اختتمت اللعبة. تحتفظ بشبكة الأمان: ' + fmt(g.secured) + '.';
    }
    const fc = el('div', { class: 'finale' });
    fc.innerHTML = `
      <div class="finale-ico">${icon}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(sub)}</p>`;
    const row = el('div', { class: 'btn-row' });
    row.appendChild(el('button', { class: 'btn primary', type: 'button', onclick: () => startMillionaire(box, g.comp) }, '🔁 اللعب مجددًا'));
    row.appendChild(el('button', { class: 'btn', type: 'button', onclick: () => setTab('quiz') }, '🏟️ قائمة المسابقات'));
    row.appendChild(el('button', { class: 'btn', type: 'button', onclick: () => setTab('miracies') }, '📖 تصفّح الآيات'));
    fc.appendChild(row);
    box.innerHTML = '';
    box.appendChild(fc);
  }

  function viewQuiz(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'مسابقات ثقافية · من يربح المليون'));
    view.appendChild(el('p', { class: 'section-desc' }, 'اختر مسابقة من مجالات الإعجاز العلمي وأجب عن الأسئلة المتدرجة من 100 إلى 1,000,000. الشبكة: عند 1000 و 32000 تضمن ما جمعته حتى لو أخطأت. استخدم الشارات بذكاء: 50:50، الجمهور، الصديق، وتغيير السؤال.'));
    const box = el('div', { class: 'million-stage' });
    view.appendChild(box);
    renderCompetitionFinder(box);
  }

  /* ---- Favorites ---- */
  function viewFavorites(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'آياتك المفضلة'));
    view.appendChild(el('p', { class: 'section-desc' }, 'الآيات التي حفظتها. تُخزّن محليًا على جهازك.'));
    const favs = MIRACLES.filter((m) => state.favorites.has(m.id));
    if (!favs.length) {
      view.appendChild(el('div', { class: 'empty' }, 'لا توجد آيات محفوظة بعد. افتح أي آية ثم اضغط «حفظ في المفضلة».'));
      return;
    }
    const grid = el('div', { class: 'grid' });
    favs.forEach((m) => grid.appendChild(miracleCard(m)));
    view.appendChild(grid);
    const row = el('div', { class: 'btn-row' });
    row.appendChild(el('button', { class: 'btn', onclick: () => { state.favorites.clear(); saveJSON(LS_FAV, []); renderView(); toast('تم مسح المفضلة'); } }, 'مسح الكل'));
    view.appendChild(row);
  }

  /* ---- References & Research ---- */
  function refCard(r) {
    const card = el('article', { class: 'ref-card' });
    card.innerHTML = `
      <div class="ref-top">
        <span class="ref-type">${esc(r.type || 'مرجع')}</span>
        ${r.year ? `<span class="ref-year">${esc(r.year)}</span>` : ''}
      </div>
      <h3>${esc(r.title)}</h3>
      <div class="ref-author">${esc(r.author || '')}${r.venue ? ' — ' + esc(r.venue) : ''}</div>
      ${r.note ? `<p>${esc(r.note)}</p>` : ''}
      ${r.summary ? `<p>${esc(r.summary)}</p>` : ''}
      ${r.url ? `<a class="ref-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">↗ فتح المرجع / البحث</a>` : ''}`;
    return card;
  }
  function viewReferences(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'مراجع معتمدة'));
    view.appendChild(el('p', { class: 'section-desc' }, 'كتب ومراجع تفسير ومصادر علمية مؤسسية (روابط بحث موثوقة).'));
    const grid = el('div', { class: 'ref-grid' });
    REFERENCES.forEach((r) => grid.appendChild(refCard(r)));
    view.appendChild(grid);

    view.appendChild(el('h3', { class: 'section-title' }, 'أبحاث ودراسات علمية'));
    view.appendChild(el('p', { class: 'section-desc' }, 'بحوث ودراسات محكّمة تُبحث عبر قواعد أكاديمية (Google Scholar / PubMed / NASA / ESA).'));
    const rgrid = el('div', { class: 'ref-grid' });
    ACADEMIC_RESEARCH.forEach((r) => rgrid.appendChild(refCard(r)));
    view.appendChild(rgrid);

    view.appendChild(el('h3', { class: 'section-title' }, 'ملاحظة أكاديمية'));
    view.appendChild(el('div', { class: 'row' },
      `<p>تعتمد مادة التطبيق على أدبيات الإعجاز العلمي المعروفة، ويُنصح دومًا بالرجوع إلى المصادر الأصلية والمحكّمة والتحقق من الاقتباسات المنسوبة للعلماء. النص القرآني ثابت قطعيًا، بينما التفسير العلمي اجتهاد بشري يتطوّر مع تقدّم العلم.</p>`));
  }

  /* ---- YouTube channels ---- */
  function ytUrl(query) { return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query); }
  function viewYoutube(view) {
    view.appendChild(el('h3', { class: 'section-title' }, 'قنوات ومحتوى يوتيوب'));
    view.appendChild(el('p', { class: 'section-desc' }, 'قنوات ومحاضرات عن الإعجاز العلمي. الأزرار تفتح نتائج البحث على يوتيوب لضمان روابط صالحة (يتطلب اتصالًا بالإنترنت).'));
    const grid = el('div', { class: 'channel-grid' });
    YOUTUBE_CHANNELS.forEach((c) => {
      const card = el('article', { class: 'channel-card' });
      card.innerHTML = `
        <div class="channel-head">
          <div class="channel-ico">▶</div>
          <div>
            <h3>${esc(c.name)}</h3>
            <div class="channel-topic">${esc(c.topic)}</div>
          </div>
        </div>
        <p>${esc(c.desc)}</p>
        <a class="channel-link" href="${esc(ytUrl(c.query))}" target="_blank" rel="noopener noreferrer">▶ شاهد على يوتيوب</a>`;
      grid.appendChild(card);
    });
    view.appendChild(grid);
  }

  /* --------------------------- Miracle modal --------------------------- */
  function openMiracle(id) {
    const m = MIRACLES.find((x) => x.id === id);
    if (!m) return;
    const c = categoryOf(m.category);
    const isFav = state.favorites.has(id);
    const body = $('#modalBody');
    body.innerHTML = `
      <div class="modal-cat">${c.icon} ${esc(c.name)}</div>
      <h2 class="modal-title" id="modalTitle">${esc(m.title)}</h2>
      <div class="ayah-block">﴿${esc(m.verse)}﴾</div>
      <div class="ayah-ref">${esc(m.verseRef)}</div>

      <div class="block"><h4>التفسير</h4><p>${esc(m.interpretation)}</p></div>
      <div class="block"><h4>دلالة الإعجاز</h4><p>${esc(m.miracleSign)}</p></div>

      ${(m.evidences && m.evidences.length) ? `<div class="block"><h4>الشواهد العلمية</h4><ul>${m.evidences.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}

      ${(m.scientists && m.scientists.length) ? `<div class="block"><h4>شهادات العلماء</h4>${m.scientists.map((s) => `
        <div class="quote">
          <div class="q-name">${esc(s.name)}</div>
          <div class="q-title">${esc(s.title || '')}</div>
          <p class="q-text">${esc(s.text)}</p>
          ${s.source ? `<span class="q-src">المصدر: ${esc(s.source)}</span>` : ''}
        </div>`).join('')}</div>` : ''}

      <div class="block"><h4>الحكمة والتطبيقات</h4>
        <p>${esc(m.wisdom)}</p>
        ${(m.applications && m.applications.length) ? `<ul>${m.applications.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      </div>

      ${(m.references && m.references.length) ? `<div class="block"><h4>المراجع العلمية</h4><ul class="refs-list">${m.references.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}

      <div class="btn-row">
        <button class="fav-btn ${isFav ? 'on' : ''}" id="favToggle">${isFav ? '⭐ محفوظة — إزالة من المفضلة' : '☆ حفظ في المفضلة'}</button>
        <button class="btn" id="copyBtn">⧉ نسخ الآية</button>
        <button class="btn" id="printBtn">🖨️ طباعة</button>
      </div>`;

    $('#favToggle', body).onclick = () => {
      if (state.favorites.has(id)) { state.favorites.delete(id); toast('أُزيلت من المفضلة'); }
      else { state.favorites.add(id); toast('أُضيفت إلى المفضلة'); }
      saveJSON(LS_FAV, Array.from(state.favorites));
      openMiracle(id);
    };
    $('#copyBtn', body).onclick = async () => {
      const text = `﴿${m.verse}﴾ — ${m.verseRef}\n${m.title}\n${m.miracleSign}`;
      try { await navigator.clipboard.writeText(text); toast('تم نسخ الآية'); }
      catch (e) { toast('تعذّر النسخ'); }
    };
    $('#printBtn', body).onclick = () => window.print();

    showModal();
  }

  function showModal() {
    const modal = $('#modal');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.setAttribute('tabindex', '-1');
    modal.focus();
  }
  function hideModal() {
    $('#modal').hidden = true;
    document.body.style.overflow = '';
  }

  /* ------------------------------ Search ------------------------------ */
  function initSearch() {
    const input = $('#search');
    const clear = $('#clearSearch');
    input.addEventListener('input', () => {
      state.search = input.value;
      clear.hidden = !input.value;
      if (state.tab !== 'miracies') { state.tab = 'miracies'; renderTabs(); history.replaceState(null, '', '#miracies'); }
      renderView();
    });
    clear.addEventListener('click', () => {
      input.value = ''; state.search = ''; clear.hidden = true; renderView(); input.focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; state.search = ''; clear.hidden = true; renderView(); }
    });
  }

  /* ------------------------------ PWA & install ------------------------------ */
  let deferredPrompt = null;
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  function showInstallHelp() {
    const body = $('#modalBody');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(navigator.userAgent);
    body.innerHTML = `
      <div class="modal-cat">⤓ تثبيت التطبيق على الجهاز</div>
      <h2 class="modal-title">تثبيت التطبيق (يعمل دون اتصال)</h2>
      <p style="color:var(--text-dim)">يمكنك إضافة التطبيق إلى شاشة هاتفك أو سطح مكتبك ليصبح كأي تطبيق أصلي ويعمل دون اتصال.</p>

      <div class="os-tabs">
        <button class="chip active" data-os="auto">✔ تلقائي (متوافق)</button>
        <button class="chip" data-os="android">🤖 أندرويد</button>
        <button class="chip" data-os="ios">🍎 آيفون/آيباد</button>
        <button class="chip" data-os="desktop">🖥️ سطح المكتب</button>
      </div>
      <ol class="install-steps">
        <li><b>أندرويد (Chrome):</b> اضغط زر القائمة ⁝ ثم «إضافة إلى الشاشة الرئيسية (Install app)». أو اضغط زر «تثبيت» أعلى الصفحة.</li>
        <li><b>آيفون/آيباد (Safari):</b> اضغط زر المشاركة ⬆ ثم اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».</li>
        <li><b>سطح المكتب (Chrome/Edge):</b> اضغط أيقونة التثبيت ⊕ في شريط العنوان، ثم اضغط «تثبيت».</li>
      </ol>

      ${isAndroid || !isIOS ? `
      <div class="qr-box">
        <img id="installQrImg" alt="رمز QR" />
        <p class="muted">افحص الرمز من هاتفك لفتح صفحة التثبيت.</p>
      </div>` : ''}

      <div class="btn-row">
        <button class="btn primary" id="tryInstallBtn">⤓ التثبيت الآن</button>
        <button class="btn" data-close>إغلاق</button>
      </div>`;

    // تلوين تبويب نظام التشغيل المناسب
    let pick = 'auto';
    if (isAndroid) pick = 'android';
    else if (isIOS) pick = 'ios';
    $$('.os-tabs .chip', body).forEach((c) => c.classList.toggle('active', c.dataset.os === pick));

    // QR كود: نص URL في رمز عبر مكتبة خارجية؟ نستخدم وحدة بسيطة بديلة: عرض الرابط.
    const qrImg = $('#installQrImg', body);
    const qrBox = $('.qr-box', body);
    if (qrImg) {
      if (location.protocol === 'file:') {
        if (box) box.style.display = 'none';
      } else {
        const url = location.href.split('#')[0];
        qrImg.onerror = () => { const box = $('.qr-box', body); if (box) box.style.display = 'none'; };
        qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url);
      }
    }

    $('#tryInstallBtn', body).onclick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        toast('تم التثبيت — ابحث عن التطبيق في شاشتك الرئيسية');
      } else if (isIOS) {
        toast('في Safari اضغط مشاركة ⬆ ثم «إضافة إلى الشاشة الرئيسية»');
      } else {
        toast('الثابت في متصفحك: استخدم إضافة إلى الشاشة الرئيسية أو التثبيت من القائمة');
      }
    };
    showModal();
  }

  function initPWA() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
    const installBtn = $('#installBtn');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); deferredPrompt = e;
    });
    if (installBtn) installBtn.addEventListener('click', showInstallHelp);
    window.addEventListener('appinstalled', () => { toast('تم تثبيت التطبيق 🎉'); });
  }
  function initNetState() {
    const upd = () => { const s = $('#netState'); if (s) s.textContent = navigator.onLine ? 'متصل' : 'غير متصل (وضع دون اتصال)'; };
    window.addEventListener('online', upd); window.addEventListener('offline', upd); upd();
  }

  /* ------------------------------ Starfield ------------------------------ */
  function initStarfield() {
    const canvas = $('#starfield');
    if (!canvas || !canvas.getContext) return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    let stars = [], raf = null, w = 0, h = 0;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      stars = Array.from({ length: Math.min(90, Math.floor((w * h) / 16000)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random() * 0.7 + 0.15,
        s: Math.random() * 0.35 + 0.05
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      stars.forEach((st) => {
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 233, 173,' + st.a.toFixed(3) + ')';
        ctx.fill();
        st.y -= st.s;
        st.x += Math.sin(st.y * 0.01) * 0.05;
        if (st.y < -2) { st.y = h + 2; st.x = Math.random() * w; }
      });
    }
    function tick() { draw(); raf = requestAnimationFrame(tick); }
    resize();
    window.addEventListener('resize', resize);
    if (reduced) { draw(); return; }
    tick();
    canvas._stop = () => { if (raf) cancelAnimationFrame(raf); };
  }

  /* ------------------------------ Splash ------------------------------ */
  function initSplash() {
    const sp = $('#splash');
    if (!sp) return;
    let done = false;
    const hide = () => {
      if (done) return;
      done = true;
      sp.classList.add('hide');
      window.setTimeout(() => { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 700);
    };
    window.setTimeout(hide, 1700);
    window.addEventListener('load', () => window.setTimeout(hide, 400));
    ['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
      window.addEventListener(ev, hide, { once: true, passive: true }));
  }

  /* ------------------------------ Init ------------------------------ */
  let tilawahEl = null;
  const savedAudio = loadJSON(LS_AUDIO, null);
  let audioEnabled = savedAudio !== false; // التلاوة مفعّلة افتراضيًا (تشغيل تلقائي عند أول تفاعل) وإن أوقفها المستخدم صراحةً تبقى موقوفة
  const AUDIO_EVENTS = ['pointerdown', 'touchstart', 'mousedown', 'click', 'keydown', 'scroll', 'wheel'];
  let unlockBound = false;

  function audioSetUI(on) {
    const btn = $('#audioBtn');
    if (!btn) return;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.innerHTML = '<span class="ib-ico" aria-hidden="true">' + (on ? '🔇' : '🔊') + '</span>';
  }
  function getTilawah() {
    if (tilawahEl) return tilawahEl;
    tilawahEl = $('#tilawah');
    if (!tilawahEl) {
      tilawahEl = document.createElement('audio');
      tilawahEl.id = 'tilawah';
      tilawahEl.src = './tilawah.mp3';
      tilawahEl.preload = 'none';
      document.body.appendChild(tilawahEl);
    }
    tilawahEl.loop = true;
    tilawahEl.volume = 0.6;
    return tilawahEl;
  }
  function removeUnlock() {
    if (!unlockBound) return;
    AUDIO_EVENTS.forEach((ev) => document.removeEventListener(ev, unlockHandler));
    document.removeEventListener('visibilitychange', unlockHandler);
    unlockBound = false;
  }
  function unlockHandler(e) {
    // لا تتعارض مع زر الصوت نفسه (زر الصوت يعالج التشغيل/الإيقاف بنفسه)
    if (e && e.target && e.target.closest && e.target.closest('#audioBtn')) { removeUnlock(); return; }
    playTilawah();
  }
  function bindUnlock() {
    if (unlockBound || !audioEnabled) return;
    AUDIO_EVENTS.forEach((ev) => document.addEventListener(ev, unlockHandler, { passive: true }));
    document.addEventListener('visibilitychange', unlockHandler);
    unlockBound = true;
  }
  function playTilawah() {
    if (!audioEnabled) return;
    const el = getTilawah();
    const p = el.play();
    if (p && p.then) p.then(() => removeUnlock()).catch(() => {});
  }
  function stopAmbient() {
    audioEnabled = false;
    saveJSON(LS_AUDIO, false);
    audioSetUI(false);
    removeUnlock();
    if (tilawahEl) { try { tilawahEl.pause(); } catch (e) {} }
  }
  function startAmbient() {
    audioEnabled = true;
    saveJSON(LS_AUDIO, true);
    audioSetUI(true);
    playTilawah();
  }
  function toggleAmbient() {
    const el = getTilawah();
    if (el.paused) startAmbient();
    else stopAmbient();
  }
  function initAmbient() {
    const btn = $('#audioBtn');
    if (!btn) return;
    getTilawah();
    audioSetUI(audioEnabled);
    if (audioEnabled) {
      playTilawah();   // محاولة تلقائية فورية (قد يمنعها المتصفح)
      bindUnlock();    // ثم تبدأ تلقائيًا عند أول تفاعل/تمرير من المستخدم
    }
    btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); toggleAmbient(); });
  }

  function init() {
    initTheme();
    $('#themeBtn').addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(cur);
    });
    // modal close handlers
    $$('#modal [data-close]').forEach((n) => n.addEventListener('click', hideModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) hideModal(); });

    initStarfield();
    initSplash();
    initSearch();
    initPWA();
    initNetState();
    initAmbient();
    initSideMenu();
    initRouter();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
