// Тема сторінок репо: світла чи темна. Поки людина не обрала — як у системі.
// Підключається в <head> без defer, щоб тема застосувалась до першого малювання.
// Перемикач малює _nav/nav.js.
(function () {
  var KEY = "pride-theme";
  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function apply(theme) {
    if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
  }

  try { apply(localStorage.getItem(KEY)); } catch (e) {}

  window.prideTheme = {
    current: function () {
      return root.getAttribute("data-theme") || (media.matches ? "dark" : "light");
    },
    set: function (theme) {
      apply(theme);
      try { localStorage.setItem(KEY, theme); } catch (e) {}
    },
    onSystemChange: function (fn) {
      if (media.addEventListener) media.addEventListener("change", fn);
      else media.addListener(fn);
    }
  };
})();
