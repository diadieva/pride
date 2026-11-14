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

  // Навігатор показує розділи й сторінки, а не стани: дерево має щонайбільше два рівні посилань.
  //   Рівень 1 — розділи («Огляд продукту», …, «Екрани»), з іконкою.
  //   Усередині розділу — підписи груп (не клікаються) і сторінки (екрани).
  //   Діти екрана — його стани: їх показують таби на сторінці екрана, у навігаторі їх немає.
  // Розділ розкривається сам, коли поточна сторінка — він або щось усередині; на інших сторінках згорнутий.
  // Один клік — одна дія: кожен пункт — звичайне посилання, окремих перемикачів немає.

  function contains(item) {
    if (item.href && normalize(root + item.href) === here) return true;
    return (item.children || []).some(contains);
  }

  // Посилання на сторінку. Екран підсвічено й тоді, коли відкрито один з його станів
  function pageLink(item, withIcon) {
    var a = document.createElement("a");
    a.href = root + item.href;
    a.className = "pn-page";
    if (normalize(a.href) === here) {
      a.className += " pn-current";
      a.setAttribute("aria-current", "page");
    } else if (contains(item) && !(item.children || []).some(function (c) { return c.children && c.children.length; })) {
      a.className += " pn-current";
      a.setAttribute("aria-current", "true");
    }
    if (withIcon && item.icon) {
      var ic = icon(item.icon);
      ic.classList.add("pn-ic");
      a.appendChild(ic);
    }
    label(a, item.title);
    return a;
  }

  // Сторінки розділу: екрани прямо або під підписами груп
  function renderSection(children) {
    var ul = document.createElement("ul");
    ul.className = "pn-sub";
    children.forEach(function (child, i) {
      var li = document.createElement("li");
      if (child.href) {
        li.appendChild(pageLink(child, false));
      } else {
        var cap = document.createElement("span");
        cap.className = "pn-group";
        cap.id = "pn-group-" + i;
        cap.textContent = child.title;
        li.appendChild(cap);
        var inner = document.createElement("ul");
        inner.setAttribute("aria-labelledby", cap.id);
        (child.children || []).forEach(function (screen) {
          if (!screen.href) return;
          var sli = document.createElement("li");
          sli.appendChild(pageLink(screen, false));
          inner.appendChild(sli);
        });
        li.appendChild(inner);
      }
      ul.appendChild(li);
    });
    return ul;
  }

  function renderItems(items) {
    var ul = document.createElement("ul");
    items.forEach(function (item) {
      var li = document.createElement("li");
      var kids = item.children || [];
      if (!kids.length) {
        li.appendChild(pageLink(item, true));
        ul.appendChild(li);
        return;
      }
      var inside = contains(item);
      var head;
      if (item.href) {
        head = pageLink(item, true);
        if (inside && !head.classList.contains("pn-current")) head.classList.add("pn-has-current");
        // Шеврон — лише індикатор стану розділу, окремо на нього не натискають
        var chev = icon("angle-right");
        chev.classList.add("pn-chev");
        head.appendChild(chev);
        if (inside) head.classList.add("is-open");
      } else {
        head = document.createElement("span");
        head.className = "pn-branch";
        if (item.icon) { var bi = icon(item.icon); bi.classList.add("pn-ic"); head.appendChild(bi); }
        label(head, item.title);
        inside = true;  // розділ без власної сторінки нікуди не веде, тож завжди розкритий
      }
      li.appendChild(head);
      if (inside) li.appendChild(renderSection(kids));
      ul.appendChild(li);
    });
    return ul;
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

    // Перехід між екранами не повинен «стрибати» навігатором: зберігаємо прокрутку між сторінками,
    // а якщо активний пункт за межами видимого — показуємо його
    try { nav.scrollTop = Number(sessionStorage.getItem("pn-scroll") || 0); } catch (e) {}
    var cur = nav.querySelector(".pn-current");
    if (cur && (cur.offsetTop < nav.scrollTop || cur.offsetTop + cur.offsetHeight > nav.scrollTop + nav.clientHeight)) {
      nav.scrollTop = cur.offsetTop - nav.clientHeight / 3;
    }
    window.addEventListener("pagehide", function () {
      try { sessionStorage.setItem("pn-scroll", String(nav.scrollTop)); } catch (e) {}
    });
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
