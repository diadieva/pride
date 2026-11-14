// Будує бокове меню з window.NAV_TREE (_nav/tree.js).
// Сторінка вказує корінь репо відносно себе: <html data-root="./"> або data-root="../../".
(function () {
  var root = document.documentElement.getAttribute("data-root") || "./";
  if (root.slice(-1) !== "/") root += "/";

  function normalize(url) {
    var u = new URL(url, location.href);
    var path = u.pathname;
    if (path.slice(-1) === "/") path += "index.html";
    return u.protocol + "//" + u.host + decodeURI(path);
  }

  var here = normalize(location.href);

  // Іконка з _nav/icons.css; поруч завжди є текст, тож для скрінрідера вона декоративна
  function icon(name) {
    var i = document.createElement("span");
    i.className = "i i-" + name;
    i.setAttribute("aria-hidden", "true");
    return i;
  }

  // Підпис пункту. У згорнутому навігаторі він візуально схований, але лишається іменем для скрінрідера
  // і текстом підказки (data-label)
  function label(el, text) {
    var span = document.createElement("span");
    span.className = "pn-label";
    span.textContent = text;
    el.appendChild(span);
    el.setAttribute("data-label", text);
  }

  // Навігатор — лише розділи першого рівня; вкладене в ньому не малюється.
  // Розділ підсвічено, коли поточна сторінка — він сам або щось усередині (наприклад, будь-який екран у «Екранах»).
  // Навігація між екранами — на самій сторінці екрана, у панелі над рамкою (renderScreenBar нижче).

  function contains(item) {
    if (item.href && normalize(root + item.href) === here) return true;
    return (item.children || []).some(contains);
  }

  // Розділ із вкладеними сторінками («Екрани») веде на останню переглянуту сторінку всередині нього —
  // з тим самим станом; уперше — на свій href. Пам'ять пишe renderStageBar
  var LAST = "pn-last-screen";
  function lastInside(item) {
    var saved = null;
    try { saved = localStorage.getItem(LAST); } catch (e) {}
    if (!saved) return null;
    var found = false;
    (function walk(list) {
      (list || []).forEach(function (c) { if (c.href === saved) found = true; walk(c.children); });
    })(item.children);
    return found ? saved : null;
  }

  function renderItems(items) {
    var ul = document.createElement("ul");
    items.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement(item.href ? "a" : "span");
      a.className = item.href ? "pn-page" : "pn-branch";
      if (item.href) a.href = root + (lastInside(item) || item.href);
      if (contains(item)) {
        a.className += " pn-current";
        a.setAttribute("aria-current", item.href && normalize(root + item.href) === here ? "page" : "true");
      }
      if (item.icon) {
        var ic = icon(item.icon);
        ic.classList.add("pn-ic");
        a.appendChild(ic);
      }
      label(a, item.title);
      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul;
  }

  // Шапка сцени над рамкою вайрфрейма, три рівні:
  //   1. шлях «Екрани / група» і назва екрана — вона ж перемикач (список усіх екранів, як у tree.js);
  //   2. вкладки станів — завжди ті самі 5, відсутні неактивні з поясненням зі сторінки;
  //   3. ширина рамки (телефон, планшет, десктоп) — тихий інструмент праворуч від шляху.
  // Будується з tree.js; ручні таби .wf-states на сторінці лишаються запасом без JavaScript і джерелом пояснень.
  // «Попередній / наступний» немає: порядок реєстру — не порядок сценарію, а переходи за сценарієм —
  // посилання всередині самого вайрфрейма.
  var STATES = [
    { stem: "", label: "Базова" },
    { stem: "порожн", label: "Порожній" },
    { stem: "помилк", label: "Помилка" },
    { stem: "завантаж", label: "Завантаження" },
    { stem: "успіх", label: "Успіх" }
  ];
  // Ширини рамки. Доступні ті, що сторінка оголосила в <html data-breakpoints="phone tablet desktop">
  // (за замовчуванням — лише телефон: інші ще не намальовано, правило — wireframes/_conventions.md)
  var BREAKPOINTS = [
    { id: "phone", icon: "mobile", label: "Телефон", width: 390 },
    { id: "tablet", icon: "tablet", label: "Планшет", width: 768 },
    { id: "desktop", icon: "desktop", label: "Десктоп", width: 1440 }
  ];

  // Смуга браузера згори рамки вайрфрейма (рядок стану + адресний рядок Safari). Декоративна,
  // скрінрідеру не потрібна. Стилі — wireframes/_frame.css (.wf-browser)
  function renderBrowserChrome() {
    document.querySelectorAll(".device").forEach(function (device) {
      if (device.querySelector(".wf-browser")) return;
      var bar = document.createElement("div");
      bar.className = "wf-browser";
      bar.setAttribute("aria-hidden", "true");
      bar.innerHTML =
        '<div class="wf-status"><span class="wf-time">9:41</span>' +
        '<span class="wf-sys"><span class="i i-signal"></span><span class="i i-wifi"></span><span class="i i-battery-full"></span></span></div>' +
        '<div class="wf-url"><span class="i i-text-size"></span>' +
        '<span class="wf-domain"><span class="i i-lock"></span>адреса сайту</span>' +
        '<span class="i i-arrow-rotate-right"></span></div>';
      device.insertBefore(bar, device.firstChild);
    });
  }

  function renderStageBar() {
    var legacy = document.querySelector(".wf-states");
    if (!legacy) return;
    var section = null, groups = [], screens = [];
    (window.NAV_TREE || []).forEach(function (top) {
      if (section || !contains(top)) return;
      (top.children || []).forEach(function (child) {
        if (child.href) { groups.push({ title: null, screens: [child] }); screens.push(child); return; }
        var list = (child.children || []).filter(function (s) { return s.href; });
        groups.push({ title: child.title, screens: list });
        screens.push.apply(screens, list);
      });
      section = top;
    });
    var current = screens.filter(contains)[0];
    if (!current) return;
    // Запам'ятати сторінку (екран чи його стан), щоб «Екрани» в навігаторі вели сюди наступного разу
    [current].concat(current.children || []).forEach(function (p) {
      if (p.href && normalize(root + p.href) === here) { try { localStorage.setItem(LAST, p.href); } catch (e) {} }
    });

    var groupTitle = "";
    groups.forEach(function (g) { if (g.screens.indexOf(current) >= 0) groupTitle = g.title || ""; });

    // Шапка сцени: шлях і ширина (тихий інструмент) → назва екрана, вона ж перемикач екранів
    var head = document.createElement("div");
    head.className = "pn-stagehead";
    var top = document.createElement("div");
    top.className = "pn-stagehead-top";
    var crumbs = document.createElement("nav");
    crumbs.className = "pn-crumbs";
    crumbs.setAttribute("aria-label", "Шлях");
    // Шлях — лише орієнтир, не посилання: інші екрани — у списку під назвою
    var home = document.createElement("span");
    home.textContent = section.title;
    crumbs.appendChild(home);
    if (groupTitle) {
      var sep = document.createElement("span");
      sep.className = "pn-crumbs-sep";
      sep.setAttribute("aria-hidden", "true");
      sep.textContent = "/";
      crumbs.appendChild(sep);
      var gt = document.createElement("span");
      gt.textContent = groupTitle;
      crumbs.appendChild(gt);
    }
    top.appendChild(crumbs);

    // Ширина рамки
    var allowed = (document.documentElement.getAttribute("data-breakpoints") || "phone").split(/\s+/);
    var device = document.querySelector(".device");
    var bp = document.createElement("div");
    bp.className = "pn-bp";
    bp.setAttribute("role", "group");
    bp.setAttribute("aria-label", "Ширина");
    var saved = "phone";
    try { saved = localStorage.getItem("pn-bp") || "phone"; } catch (e) {}
    if (allowed.indexOf(saved) < 0) saved = "phone";
    var buttons = BREAKPOINTS.map(function (b) {
      var btn = document.createElement("button");
      btn.type = "button";
      var on = allowed.indexOf(b.id) >= 0;
      var text = b.label + " · " + b.width + " px" + (on ? "" : " — ще не намальовано");
      btn.title = text;
      btn.setAttribute("aria-label", text);
      btn.appendChild(icon(b.icon));
      if (!on) btn.setAttribute("aria-disabled", "true");
      btn.addEventListener("click", function () { if (on) apply(b.id, true); });
      bp.appendChild(btn);
      return [b, btn];
    });
    function apply(id, remember) {
      buttons.forEach(function (pair) { pair[1].setAttribute("aria-pressed", String(pair[0].id === id)); });
      var b = BREAKPOINTS.filter(function (x) { return x.id === id; })[0];
      if (device && allowed.length > 1) device.style.width = "min(" + b.width + "px, 100%)";
      document.documentElement.setAttribute("data-bp", id);
      if (remember) { try { localStorage.setItem("pn-bp", id); } catch (e) {} }
    }
    apply(saved, false);
    top.appendChild(bp);
    head.appendChild(top);

    var menu = document.createElement("details");
    menu.className = "pn-screens";
    var summary = document.createElement("summary");
    summary.setAttribute("aria-label", "Екран: " + current.title + ". Відкрити список усіх екранів");
    var title = document.createElement("span");
    title.textContent = current.title;
    summary.appendChild(title);
    var chev = icon("angle-right");
    chev.classList.add("pn-screens-chev");
    summary.appendChild(chev);
    menu.appendChild(summary);
    var pop = document.createElement("div");
    pop.className = "pn-screens-pop";
    groups.forEach(function (g, gi) {
      if (g.title) {
        var cap = document.createElement("span");
        cap.className = "pn-screens-group";
        cap.id = "pn-sg-" + gi;
        cap.textContent = g.title;
        pop.appendChild(cap);
      }
      var ul = document.createElement("ul");
      if (g.title) ul.setAttribute("aria-labelledby", "pn-sg-" + gi);
      g.screens.forEach(function (s) {
        var li = document.createElement("li"), a = document.createElement("a");
        a.href = root + s.href;
        a.textContent = s.title;
        if (s === current) { a.className = "is-current"; a.setAttribute("aria-current", "true"); }
        li.appendChild(a);
        ul.appendChild(li);
      });
      pop.appendChild(ul);
    });
    menu.appendChild(pop);
    document.addEventListener("click", function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    menu.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.open) { menu.open = false; summary.focus(); }
    });
    head.appendChild(menu);

    // Вкладки станів — завжди ті самі 5; відсутні неактивні, з поясненням зі сторінки («Успіху немає: …»).
    // Смуга вкладок закріплена вгорі; коли шапка поїхала вгору, ліворуч з'являється коротка назва екрана
    var notes = [].map.call(legacy.querySelectorAll("span"), function (sp) { return sp.textContent.trim(); });
    var tabs = document.createElement("nav");
    tabs.className = "pn-tabs";
    tabs.setAttribute("aria-label", "Стани екрана «" + current.title + "»");
    var mini = document.createElement("span");
    mini.className = "pn-tabs-screen";
    mini.setAttribute("aria-hidden", "true");
    mini.textContent = current.title;
    tabs.appendChild(mini);
    STATES.forEach(function (st) {
      var target = st.stem ? (current.children || []).filter(function (c) {
        return c.href && c.title.toLowerCase().indexOf(st.stem) === 0;
      })[0] : current;
      var el;
      if (target) {
        el = document.createElement("a");
        el.href = root + target.href;
        if (normalize(el.href) === here) el.setAttribute("aria-current", "page");
        el.textContent = st.label;
      } else {
        el = document.createElement("span");
        el.className = "is-off";
        var why = notes.filter(function (n) { return n.toLowerCase().indexOf(st.stem) === 0; })[0] || (st.label + " — у цього екрана немає");
        el.title = why;
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-disabled", "true");
        el.textContent = st.label;
        var sr = document.createElement("span");
        sr.className = "pn-sr";
        sr.textContent = ". " + why;
        el.appendChild(sr);
      }
      el.classList.add("pn-tab");
      tabs.appendChild(el);
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        tabs.classList.toggle("is-stuck", !entries[0].isIntersecting);
      }).observe(menu);
    }

    legacy.parentNode.insertBefore(head, legacy);
    legacy.parentNode.insertBefore(tabs, legacy);
    document.documentElement.classList.add("pn-stage-on");
  }

  // Перемикач теми: дві кнопки, натиснута — поточна тема (_nav/theme.js).
  function renderThemeSwitch(theme) {
    var group = document.createElement("div");
    group.className = "pn-theme";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Тема");
    var buttons = [["light", "sun", "Світла"], ["dark", "moon", "Темна"]].map(function (opt) {
      var b = document.createElement("button");
      b.type = "button";
      b.appendChild(icon(opt[1]));
      label(b, opt[2]);
      b.addEventListener("click", function () { theme.set(opt[0]); sync(); });
      group.appendChild(b);
      return [opt[0], b];
    });
    function sync() {
      var current = theme.current();
      buttons.forEach(function (pair) { pair[1].setAttribute("aria-pressed", String(pair[0] === current)); });
    }
    sync();
    theme.onSystemChange(sync);
    return group;
  }

  // Згортання навігатора (лише на ширині понад 760px): стрілка з'являється, коли курсор над навігатором
  // або фокус у ньому; клавіша [ теж перемикає. Стан пам'ятаємо між сторінками.
  var COLLAPSED = "pn-collapsed";
  function savedCollapsed() { try { return localStorage.getItem(COLLAPSED) === "1"; } catch (e) { return false; } }
  if (savedCollapsed()) document.documentElement.classList.add(COLLAPSED);

  function renderCollapseButton() {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pn-collapse";
    b.setAttribute("aria-controls", "pn");
    var ic = icon("angles-left");
    b.appendChild(ic);
    function sync() {
      var collapsed = document.documentElement.classList.contains(COLLAPSED);
      var text = collapsed ? "Розгорнути навігатор" : "Згорнути навігатор";
      ic.className = "i i-" + (collapsed ? "angles-right" : "angles-left");
      b.setAttribute("aria-expanded", String(!collapsed));
      b.setAttribute("aria-label", text);
      b.title = text + " ([)";
    }
    function toggle() {
      var collapsed = document.documentElement.classList.toggle(COLLAPSED);
      try { localStorage.setItem(COLLAPSED, collapsed ? "1" : "0"); } catch (e) {}
      hideTip();
      sync();
    }
    b.addEventListener("click", toggle);
    document.addEventListener("keydown", function (e) {
      if (e.code !== "BracketLeft" || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (window.matchMedia("(max-width: 760px)").matches) return;
      e.preventDefault();
      toggle();
    });
    sync();
    return b;
  }

  // Підказка з назвою пункту в згорнутому навігаторі. Окремий елемент поза .pn, бо .pn обрізає все, що за його краєм
  var tip = null;
  function showTip(el) {
    // Підказка потрібна там, де підпису не видно: у згорнутому навігаторі та на кнопках теми
    var hidden = document.documentElement.classList.contains(COLLAPSED) || el.closest(".pn-theme");
    if (!hidden || window.matchMedia("(max-width: 760px)").matches) return;
    var r = el.getBoundingClientRect();
    tip.textContent = el.getAttribute("data-label");
    tip.style.top = r.top + r.height / 2 + "px";
    tip.style.left = r.right + 10 + "px";
    tip.hidden = false;
  }
  function hideTip() { if (tip) tip.hidden = true; }

  function build() {
    var nav = document.createElement("nav");
    nav.className = "pn";
    nav.id = "pn";
    nav.setAttribute("aria-label", "Навігатор репо");

    var head = document.createElement("div");
    head.className = "pn-head";
    head.textContent = "Прайд · репо";
    nav.appendChild(head);
    nav.appendChild(renderItems(window.NAV_TREE || []));
    // Перемикач теми — внизу навігатора: це налаштування, а не навігація
    if (window.prideTheme) nav.appendChild(renderThemeSwitch(window.prideTheme));

    var toggle = document.createElement("button");
    toggle.className = "pn-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-controls", "pn");
    toggle.setAttribute("aria-expanded", "false");
    toggle.appendChild(icon("menu-bars"));
    toggle.appendChild(document.createTextNode("Навігатор"));
    toggle.addEventListener("click", function () {
      var open = document.documentElement.classList.toggle("pn-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    tip = document.createElement("div");
    tip.className = "pn-tip";
    tip.setAttribute("aria-hidden", "true");
    tip.hidden = true;
    nav.querySelectorAll("[data-label]").forEach(function (el) {
      el.addEventListener("pointerenter", function () { showTip(el); });
      el.addEventListener("pointerleave", hideTip);
      el.addEventListener("focus", function () { showTip(el); });
      el.addEventListener("blur", hideTip);
    });
    nav.addEventListener("scroll", hideTip);

    document.body.insertBefore(nav, document.body.firstChild);
    document.body.insertBefore(toggle, nav);
    nav.insertAdjacentElement("afterend", renderCollapseButton());
    document.body.appendChild(tip);

    renderStageBar();
    renderBrowserChrome();
    document.documentElement.classList.add("pn-on");
    // Анімацію ширини вмикаємо після першого кадру, щоб збережений стан не «проїжджав» при завантаженні
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      document.documentElement.classList.add("pn-ready");
    }); });
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);

  // Автооновлення після пушу: щойно на GitHub Pages новий деплой, сторінка перезавантажується сама.
  // Для сторінки, її стилів і скриптів порівнюємо Last-Modified: що показано / що в кеші браузера
  // проти того, що зараз на сервері. Запит із cache: "no-cache" заодно оновлює кеш, тож після
  // перезавантаження браузер бере вже нові файли. Перевірка — кожні 10 с, поки вкладка на екрані,
  // і щойно на неї повертаються. Локально (file://) не працює.
  function watchDeploys() {
    if (location.protocol === "file:" || !window.fetch) return;
    var page = location.href.split("#")[0];
    var loaded = null; // Last-Modified сторінки, яку показано зараз
    var checking = false;
    var pending = false; // зміну знайдено, чекаємо, поки можна перезавантажити

    function stamp(url, mode) {
      return fetch(url, { cache: mode }).then(function (r) {
        return r.ok ? r.headers.get("last-modified") : null;
      });
    }

    // Старий і свіжий штамп файлу: спершу з кешу, потім із сервера (кеш при цьому оновлюється)
    function changed(url) {
      return stamp(url, "force-cache").then(function (cached) {
        return stamp(url, "no-cache").then(function (fresh) { return !!fresh && fresh !== cached; });
      });
    }

    function assets() {
      var urls = [];
      document.querySelectorAll('link[rel="stylesheet"][href], script[src]').forEach(function (el) {
        var u = new URL(el.href || el.src, location.href);
        if (u.origin === location.origin) urls.push(u.href);
      });
      return urls;
    }

    function recentlyReloaded() {
      try { return Date.now() - Number(sessionStorage.getItem("pn-live-reload") || 0) < 20000; } catch (e) { return false; }
    }

    function check() {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      Promise.all([stamp(page, "no-cache")].concat(assets().map(changed))).then(function (res) {
        if (!loaded) { loaded = res[0]; return; }
        if ((res[0] && res[0] !== loaded) || res.slice(1).some(Boolean)) pending = true;
        if (!pending || recentlyReloaded()) return;
        try { sessionStorage.setItem("pn-live-reload", String(Date.now())); } catch (e) {}
        location.reload();
      }).catch(function () {}).then(function () { checking = false; });
    }

    stamp(page, "force-cache").then(function (v) {
      loaded = v;
      check();
      setInterval(check, 10000);
      document.addEventListener("visibilitychange", check);
      window.addEventListener("focus", check);
    }).catch(function () {});
  }

  watchDeploys();
})();
