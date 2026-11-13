// Дерево сторінок репо — єдине джерело для навігатора (_nav/nav.js).
// Елемент із href — сторінка; без href — гілка. children — вкладені сторінки (наприклад, стани екрана).
// href — шлях від кореня репо. У дереві лише сторінки, які вже існують.
// icon — ім'я іконки з _nav/icons.css (без «i-»); вона ж лишається в згорнутому навігаторі, тож обов'язкова.
// Гілку заводимо, лише коли в ній дві й більше сторінок: гілка з однією сторінкою дублює її назву.
//
// Приклад гілки:
// { title: "Екрани", icon: "…", children: [
//   { title: "Екран", href: "screens/screen.html", icon: "…", children: [
//     { title: "Порожній стан", href: "screens/screen-empty.html", icon: "…" }
//   ] }
// ] }

window.NAV_TREE = [
  { title: "Огляд продукту", href: "index.html", icon: "house" },
  { title: "Дослідження", href: "research/research.html", icon: "search-text" },
  { title: "Персони і JTBD", href: "personas.html", icon: "users" },
  { title: "Структура", href: "ia.html", icon: "sitemap" }
];
