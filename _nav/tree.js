// Дерево сторінок репо — єдине джерело для навігатора (_nav/nav.js).
// Елемент із href — сторінка; без href — гілка. children — вкладені сторінки (наприклад, стани екрана).
// href — шлях від кореня репо. У дереві лише сторінки, які вже існують.
// icon — ім'я іконки з _nav/icons.css (без «i-»). Обов'язкова для пунктів першого рівня: у згорнутому навігаторі
// лишаються лише вони. Вкладені пункти (гілка «Екрани») показуються без іконок.
// Гілку заводимо, лише коли в ній дві й більше сторінок: гілка з однією сторінкою дублює її назву.
// Виняток — гілка «Екрани»: вона повторює групи з sitemap.md. Розділ групи з'являється разом
// з першою сторінкою її екрана, навіть якщо сторінка одна. Назви групи й екрана — дослівно з sitemap.md.
//
// Навігатор малює лише пункти першого рівня; розділ підсвічено, коли поточна сторінка — він або щось усередині.
// Гілку «Екрани» читає шапка сцени на сторінці екрана (шлях, назва екрана зі списком усіх екранів,
// вкладки станів). Окремої посадкової сторінки немає: «Екрани» відкриває останній переглянутий екран
// (його пам'ятає nav.js), уперше — href розділу, тобто головну сторінку. Назви станів починаються з «Порожній», «Помилка»,
// «Завантаження», «Успіх» — за ними шапка ставить стан на його місце у вкладках. Дитина екрана з іншою назвою —
// варіант базової сторінки (наприклад, «Результати» в «Пошуку», «Меню відкрите» на головній сторінці): своя вкладка одразу після «Базова»,
// з назвою з tree.js, у порядку tree.js. Варіанти ставимо в children першими, перед станами.
//
// Будова гілки «Екрани»:
// { title: "Екрани", href: "wireframes/board.html", icon: "mobile", children: [
//   { title: "<група>", icon: "…", children: [
//     { title: "<екран>", href: "wireframes/<ім'я>.html", icon: "…", children: [
//       { title: "Порожній стан", href: "wireframes/<ім'я>-empty.html", icon: "…" }
//     ] }
//   ] }
// ] }

window.NAV_TREE = [
  { title: "Огляд продукту", href: "index.html", icon: "file-text" },
  { title: "Дослідження", href: "research/research.html", icon: "search-text" },
  { title: "Персони і JTBD", href: "personas.html", icon: "users" },
  { title: "Структура", href: "ia.html", icon: "sitemap" },
  { title: "Екрани", href: "wireframes/board.html", icon: "mobile", children: [
    { title: "Знайти свою тварину", icon: "folder-search", children: [
      { title: "Головна сторінка", href: "wireframes/board.html", icon: "newspaper", children: [
        { title: "Меню відкрите", href: "wireframes/board-menu.html", icon: "menu-bars" },
        { title: "Порожній стан", href: "wireframes/board-empty.html", icon: "inbox" },
        { title: "Помилка", href: "wireframes/board-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/board-loading.html", icon: "hourglass" }
      ] },
      { title: "Усі тварини", href: "wireframes/animals.html", icon: "search-text", children: [
        { title: "Фільтри", href: "wireframes/animals-filters.html", icon: "sliders-simple" },
        { title: "Порожній стан", href: "wireframes/animals-empty.html", icon: "inbox" },
        { title: "Помилка", href: "wireframes/animals-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/animals-loading.html", icon: "hourglass" }
      ] },
      { title: "Пошук", href: "wireframes/search.html", icon: "search", children: [
        { title: "Результати", href: "wireframes/search-results.html", icon: "search-text" },
        { title: "Порожній стан", href: "wireframes/search-empty.html", icon: "inbox" },
        { title: "Помилка", href: "wireframes/search-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/search-loading.html", icon: "hourglass" }
      ] },
      { title: "Профіль тварини", href: "wireframes/animal.html", icon: "paw", children: [
        { title: "Ви стежите", href: "wireframes/animal-following.html", icon: "check-circle" },
        { title: "Порожній стан", href: "wireframes/animal-empty.html", icon: "inbox" },
        { title: "Помилка", href: "wireframes/animal-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/animal-loading.html", icon: "hourglass" },
        { title: "Успіх", href: "wireframes/animal-success.html", icon: "check-circle" }
      ] }
    ] },
    { title: "Підтримати", icon: "folder-dollar", children: [
      { title: "Опіка над твариною", href: "wireframes/care.html", icon: "wallet-heart", children: [
        { title: "Помилка", href: "wireframes/care-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/care-loading.html", icon: "hourglass" },
        { title: "Успіх", href: "wireframes/care-success.html", icon: "check-circle" }
      ] },
      { title: "Донат центру", href: "wireframes/donate.html", icon: "wallet", children: [
        { title: "Порожній стан", href: "wireframes/donate-empty.html", icon: "inbox" },
        { title: "Помилка", href: "wireframes/donate-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/donate-loading.html", icon: "hourglass" },
        { title: "Успіх", href: "wireframes/donate-success.html", icon: "check-circle" }
      ] }
    ] },
    { title: "Мої улюбленці", icon: "folder-heart", children: [
      { title: "Мої улюбленці", href: "wireframes/my-animals.html", icon: "heart", children: [
        { title: "Порожній стан", href: "wireframes/my-animals-empty.html", icon: "inbox" },
        { title: "Помилка", href: "wireframes/my-animals-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/my-animals-loading.html", icon: "hourglass" }
      ] },
      { title: "Моя допомога", href: "wireframes/my-support.html", icon: "wallet", children: [
        { title: "Порожній стан", href: "wireframes/my-support-empty.html", icon: "inbox" },
        { title: "Помилка", href: "wireframes/my-support-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/my-support-loading.html", icon: "hourglass" }
      ] },
      { title: "Керування допомогою", href: "wireframes/manage.html", icon: "wallet-gear", children: [
        { title: "Змінити суму", href: "wireframes/manage-amount.html", icon: "coin" },
        { title: "Призупинити", href: "wireframes/manage-pause.html", icon: "pause-circle" },
        { title: "Спосіб оплати", href: "wireframes/manage-method.html", icon: "card-exchange" },
        { title: "Скасувати", href: "wireframes/manage-cancel.html", icon: "xmark-circle" },
        { title: "Помилка", href: "wireframes/manage-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/manage-loading.html", icon: "hourglass" },
        { title: "Успіх", href: "wireframes/manage-success.html", icon: "check-circle" }
      ] },
      { title: "Налаштування", href: "wireframes/my-subscriptions.html", icon: "sliders-simple", children: [
        { title: "Помилка", href: "wireframes/my-subscriptions-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/my-subscriptions-loading.html", icon: "hourglass" },
        { title: "Успіх", href: "wireframes/my-subscriptions-success.html", icon: "check-circle" }
      ] }
    ] },
    { title: "Повернутися до своїх", icon: "folder-user", children: [
      { title: "Вхід", href: "wireframes/login.html", icon: "door-open", children: [
        { title: "Помилка", href: "wireframes/login-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/login-loading.html", icon: "hourglass" },
        { title: "Успіх", href: "wireframes/login-success.html", icon: "envelope-check" }
      ] }
    ] },
    { title: "Хто такі «Прайд»", icon: "folder-info", children: [
      { title: "Про центр", href: "wireframes/center.html", icon: "building", children: [
        { title: "Помилка", href: "wireframes/center-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/center-loading.html", icon: "hourglass" }
      ] }
    ] },
    { title: "Забрати додому", icon: "folder-location-pin", children: [
      { title: "Заявка на прилаштування", href: "wireframes/adopt.html", icon: "house", children: [
        { title: "Помилка", href: "wireframes/adopt-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/adopt-loading.html", icon: "hourglass" },
        { title: "Успіх", href: "wireframes/adopt-success.html", icon: "check-circle" }
      ] }
    ] },
    { title: "Команда центру", icon: "folder-gear", children: [
      { title: "Нове оновлення", href: "wireframes/post.html", icon: "newspaper", children: [
        { title: "Помилка", href: "wireframes/post-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/post-loading.html", icon: "hourglass" },
        { title: "Успіх", href: "wireframes/post-success.html", icon: "check-circle" }
      ] },
      { title: "Вхід для команди", href: "wireframes/team-login.html", icon: "lock", children: [
        { title: "Помилка", href: "wireframes/team-login-error.html", icon: "exclamation-circle" },
        { title: "Завантаження", href: "wireframes/team-login-loading.html", icon: "hourglass" },
        { title: "Успіх", href: "wireframes/team-login-success.html", icon: "envelope-check" }
      ] }
    ] }
  ] }
];
