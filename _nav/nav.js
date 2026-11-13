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

  function renderItems(items) {
    var ul = document.createElement("ul");
    items.forEach(function (item) {
      var li = document.createElement("li");
      var label;
      if (item.href) {
        label = document.createElement("a");
        label.href = root + item.href;
        label.className = "pn-page";
        if (normalize(label.href) === here) {
          label.className += " pn-current";
          label.setAttribute("aria-current", "page");
        }
      } else {
        label = document.createElement("span");
        label.className = "pn-branch";
      }
      label.textContent = item.title;
      li.appendChild(label);
      if (item.children && item.children.length) li.appendChild(renderItems(item.children));
      ul.appendChild(li);
    });
    return ul;
  }

  // Іконка з _nav/icons.css; поруч завжди є текст, тож для скрінрідера вона декоративна
  function icon(name) {
    var i = document.createElement("span");
    i.className = "i i-" + name;
    i.setAttribute("aria-hidden", "true");
    return i;
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
      b.appendChild(document.createTextNode(opt[2]));
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

  function build() {
    var nav = document.createElement("nav");
    nav.className = "pn";
    nav.id = "pn";
    nav.setAttribute("aria-label", "Навігатор репо");

    var head = document.createElement("div");
    head.className = "pn-head";
    head.textContent = "Прайд · репо";
    nav.appendChild(head);
    if (window.prideTheme) nav.appendChild(renderThemeSwitch(window.prideTheme));
    nav.appendChild(renderItems(window.NAV_TREE || []));

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

    document.body.insertBefore(nav, document.body.firstChild);
    document.body.insertBefore(toggle, nav);
    document.documentElement.classList.add("pn-on");
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
