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

  // Розкриті гілки дерева: { "Екрани/Знайти свою тварину": true, … }. Без запису — розкрито лише шлях
  // до поточної сторінки; вибір людини пам'ятаємо між сторінками
  var OPEN = "pn-open", openState = {}, uid = 0;
  try { openState = JSON.parse(localStorage.getItem(OPEN) || "{}") || {}; } catch (e) {}
  function saveOpen() { try { localStorage.setItem(OPEN, JSON.stringify(openState)); } catch (e) {} }
  var expandNav = function () {};  // підміняє renderCollapseButton

  function renderItems(items, path) {
    var ul = document.createElement("ul");
    items.forEach(function (item) {
      var li = document.createElement("li");
      var key = path ? path + "/" + item.title : item.title;
      var hasKids = item.children && item.children.length;
      var el;
      if (item.href) {
        el = document.createElement("a");
        el.href = root + item.href;
        el.className = "pn-page";
        if (normalize(el.href) === here) {
          el.className += " pn-current";
          el.setAttribute("aria-current", "page");
        }
      } else {
        el = document.createElement("button");
        el.type = "button";
        el.className = "pn-branch";
      }
      if (item.icon) {
        var ic = icon(item.icon);
        ic.classList.add("pn-ic");
        el.appendChild(ic);
      }
      label(el, item.title);
      if (!hasKids) {
        li.appendChild(el);
        ul.appendChild(li);
        return;
      }

      // Пункт із вкладеними: назва веде на сторінку, стрілка праворуч розкриває й згортає.
      // Розділ без сторінки (група екранів) розкривається кліком по всьому рядку.
      var sub = renderItems(item.children, key);
      sub.id = "pn-sub-" + (++uid);
      var inside = !!sub.querySelector(".pn-current");
      if (inside) el.classList.add("pn-has-current");
      var chev = icon("angle-right");
      chev.classList.add("pn-chev");
      var twisty = el;
      if (item.href) {
        twisty = document.createElement("button");
        twisty.type = "button";
        twisty.className = "pn-twisty";
        twisty.setAttribute("aria-label", item.title + ": вкладені пункти");
      }
      twisty.appendChild(chev);
      twisty.setAttribute("aria-controls", sub.id);
      function set(open, remember) {
        sub.hidden = !open;
        twisty.setAttribute("aria-expanded", String(open));
        if (remember) { openState[key] = open; saveOpen(); }
      }
      set(inside || openState[key] === true, false);
      twisty.addEventListener("click", function () {
        if (document.documentElement.classList.contains(COLLAPSED)) { expandNav(); set(true, true); return; }
        set(sub.hidden, true);
      });
      var row = document.createElement("div");
      row.className = "pn-row";
      row.appendChild(el);
      if (twisty !== el) row.appendChild(twisty);
      li.appendChild(row);
      li.appendChild(sub);
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
    expandNav = function () { if (document.documentElement.classList.contains(COLLAPSED)) toggle(); };
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
