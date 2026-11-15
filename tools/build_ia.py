# Збирає ia.html — знімок sitemap.md і flows.md для перегляду.
# Запуск з кореня репо: python3 tools/build_ia.py
# Джерело правди — markdown; ia.html руками не редагується.
import re, html, os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, 'tools', 'ia.tpl.html')
S = open(ROOT + '/sitemap.md', encoding='utf-8').read()
F = open(ROOT + '/flows.md', encoding='utf-8').read()
GH = 'https://github.com/diadieva/pride/blob/main/'

JOBNAMES = {}
def esc(t): return html.escape(t, quote=False)

def link_href(u):
    if u.startswith('http'): return u
    if u.startswith('#'): return GH + 'sitemap.md' + u
    return GH + u

def inline(t):
    t = esc(t)
    t = t.replace('[?]', '\x00Q\x00')
    t = re.sub(r'\[(ЗАКОН|КОМАНДА|СИРОТА)\]', lambda m: f'<span class="mk mk-{ {"ЗАКОН":"law","КОМАНДА":"team","СИРОТА":"orph"}[m.group(1)] }">{m.group(1).lower()}</span>', t)
    def job(m):
        j = m.group(1); cls = 'job hyp-job' if j.startswith('Г') else 'job'
        return f'<span class="{cls}" title="{esc(JOBNAMES.get(j, ""))}">{j}</span>'
    t = re.sub(r'\[([MREГS]\d?)\]\[[a-zг0-9]+\]', job, t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: f'<a href="{link_href(m.group(2))}">{m.group(1)}</a>', t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'~~([^~]+)~~', r'<s>\1</s>', t)
    t = t.replace('\x00Q\x00', '<span class="q">[?]</span>')
    return t

def lists(block):
    """markdown lists (1 or 2 levels, numbered or bullets) -> html"""
    out, stack = [], []
    for line in block.strip('\n').split('\n'):
        if not line.strip(): continue
        m = re.match(r'^( *)(\d+\.|-) (.*)$', line)
        if not m:
            out.append(f'<p>{inline(line)}</p>'); continue
        lvl = len(m.group(1)) // 2
        tag = 'ol' if m.group(2)[0].isdigit() else 'ul'
        while len(stack) > lvl + 1: out.append(f'</li></{stack.pop()}>')
        if len(stack) == lvl + 1:
            if stack[-1] != tag: out.append(f'</li></{stack.pop()}><{tag}><li>'); stack.append(tag)
            else: out.append('</li><li>')
        else:
            out.append(f'<{tag}><li>'); stack.append(tag)
        out.append(inline(m.group(3)))
    while stack: out.append(f'</li></{stack.pop()}>')
    return ''.join(out)

def table(text, start):
    lines = text[text.index(start):].split('\n')
    rows = []
    for l in lines:
        if not l.startswith('|'): break
        rows.append([c.strip() for c in re.split(r'(?<!\\)\|', l.strip())[1:-1]])
    return rows[0], rows[2:]

# ---------- jobs names from matrix ----------
mh, mrows = table(S, '| Job | `board`')
for r in mrows:
    m = re.search(r'\[([MREГS]\d?)\]\[[^\]]+\] · (.+?)(?: \[\?\])?~*$', r[0])
    if m: JOBNAMES[m.group(1)] = m.group(2).strip('~ ')

# ---------- registry ----------
rh, rrows = table(S, '| Група | Екран | Файл | Job | Що на екрані | Стани |')
groups, cur = [], None
for g, name, f, jobs, desc, states in rrows:
    if g:
        gm = re.match(r'\*\*(.+?)\*\*(?: · (.*))?', g)
        cur = {'name': gm.group(1), 'ent': gm.group(2) or '', 'screens': []}
        groups.append(cur)
    cur['screens'].append({'name': name, 'file': f.strip('`'), 'jobs': jobs, 'desc': desc, 'states': states})

th, trows = table(S, '| Екран | Тип | Звідки | Чому так |')
TYPE = {r[0].strip('`'): r[1] for r in trows}
nh, nrows = table(S, '| # | Пункт | Веде в | Група екранів | Job за пунктом |')
TAB = {}
for r in nrows:
    TAB[re.search(r'`([a-z-]+\.html)`', r[2]).group(1)] = r[1]
def navcards():
    o = ['<div class="navstrip">']
    for r in nrows:
        f = re.search(r'`([a-z-]+\.html)`', r[2]).group(1)
        jobs = ' '.join(dict.fromkeys(re.findall(r'\[[MREГS]\d?\]\[[a-zг0-9]+\]', r[4])))
        o.append(f'<div class="navcard"><span class="nnum">{r[0]}</span><b>{esc(r[1])}</b><code class="file">{f}</code><span class="jobs">{inline(jobs)}</span></div>')
    o.append('</div>')
    return ''.join(o)
result = re.search(r'^\*\*Результат: (.+?)\*\*$', S, re.M).group(1)

def tree():
    o = ['<ul class="tree"><li class="root"><span class="root-name">Прайд</span>'
         f'<span class="root-meta">{sum(len(g["screens"]) for g in groups)} екранів · {len(groups)} груп</span><ul>']
    for g in groups:
        o.append(f'<li class="group"><div class="gname">{esc(g["name"])}'
                 + (f' <span class="ent">{esc(g["ent"])}</span>' if g['ent'] else '') + '</div><ul>')
        for s in g['screens']:
            main = 'головний' in s['desc']
            desc = re.sub(r'^\*\*головний\*\* · ', '', s['desc'])
            t = TYPE.get(s['file'], '')
            badges = ''
            if main: badges += '<span class="badge main">головний</span>'
            if s['file'] in TAB: badges += f'<span class="badge tab">таб «{esc(TAB[s["file"]])}»</span>'
            if t: badges += f'<span class="badge type">{esc(t)}</span>'
            o.append(f'<li class="screen{" is-main" if main else ""}"><details><summary>'
                     f'<span class="sname">{esc(s["name"])}</span> <code class="file">{s["file"]}</code>'
                     f'<span class="jobs">{inline(re.sub(r"(\]) ?[,—] ?", r"\1 ", s["jobs"]))}</span>{badges}</summary>'
                     + (f'<p><a class="wf-open" href="wireframes/{s["file"]}"><span class="i i-mobile" aria-hidden="true"></span>Відкрити вайрфрейм</a></p>'
                        if os.path.exists(os.path.join(ROOT, 'wireframes', s['file'])) else '')
                     + f'<p>{inline(desc)}</p>'
                     + ''.join(f'<p>{inline(st)}</p>' for st in s['states'].split('<br>') if st)
                     + '</details></li>')
        o.append('</ul></li>')
    o.append('</ul></li></ul>')
    return ''.join(o)

# ---------- matrix ----------
def matrix():
    cols = [c.strip('`~') for c in mh[1:]]
    struck = [c.startswith('~~') for c in mh[1:]]
    counts = [0] * len(cols)
    body = []
    for r in mrows:
        for i, c in enumerate(r[1:]):
            if c == 'x': counts[i] += 1
    names = {s['file'][:-5]: s['name'] for g in groups for s in g['screens']}
    merged = {'account': 'злито в my-subscriptions', 'legal': 'злито в center'}
    o = ['<div class="table-wrap matrix"><table><thead><tr><th scope="col" class="jobcol">Job</th>']
    for i, c in enumerate(cols):
        cls = 'orph' if counts[i] == 0 else ('near' if counts[i] == 1 else '')
        note = merged.get(c, 'сирота') if counts[i] == 0 else ('1 job' if counts[i] == 1 else '')
        label = f'<s>{c}</s>' if struck[i] else c
        o.append(f'<th scope="col" class="{cls}" title="{esc(names.get(c, c))}"><span class="cn">{label}</span>'
                 + (f'<small>{note}</small>' if note else '') + '</th>')
    o.append('</tr></thead><tbody>')
    for r in mrows:
        n = sum(1 for c in r[1:] if c == 'x')
        jobm = re.search(r'\[([MREГS]\d?)\]', r[0]).group(1)
        rcls = 'orph' if n == 0 else ''
        hyp = ' hyp-row' if jobm.startswith('Г') else ''
        label = inline(re.sub(r'^~~(.*)~~$', r'\1', r[0]))
        if r[0].startswith('~~'): label = f'<s>{label}</s><small>сирота → backlog</small>'
        o.append(f'<tr class="{rcls}{hyp}"><th scope="row">{label}</th>')
        for i, c in enumerate(r[1:]):
            ccls = 'orph' if counts[i] == 0 else ('near' if counts[i] == 1 else '')
            mark = '<span class="x" aria-label="бере участь">×</span>' if c == 'x' else ''
            o.append(f'<td class="{ccls}">{mark}</td>')
        o.append('</tr>')
    o.append('</tbody></table></div>')
    return ''.join(o)

def md_table(start):
    h, rows = table(S, start)
    o = ['<div class="table-wrap"><table><thead><tr>'] + [f'<th scope="col">{inline(c)}</th>' for c in h] + ['</tr></thead><tbody>']
    for r in rows:
        o.append('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>')
    o.append('</tbody></table></div>')
    return ''.join(o)

def section_text(src, head, stop=r'\n#{2,3} '):
    i = src.index(head) + len(head)
    m = re.search(stop, src[i:])
    return src[i:i + m.start()] if m else src[i:]

near = section_text(S, '**Майже сироти**')
near = near[near.index('\n'):]
rule = section_text(S, '**Коли ставимо «x».**', r'\n\n')
after = section_text(S, '### Після дій\n')

# ---------- flows ----------
parts = re.split(r'\n## ', F)
why_h, why_rows = table(F, '| Flow | Чому |')
flows = []
for p in parts[1:]:
    title, body = p.split('\n', 1)
    if '```mermaid' not in body: continue
    meta, rest = body.split('```mermaid', 1)
    code, tail = rest.split('```', 1)
    code = re.sub(r'^(\s*classDef \w+) .*$', r'\1 font-style:normal', code, flags=re.M)
    flows.append({'title': title.strip(), 'meta': meta.strip(), 'code': code.strip('\n'), 'tail': tail.strip().rstrip('-').strip()})
lessons = section_text(F, '## Що flows показали для продукту\n', r'\Z')

def fid(t):
    j = t.split(' · ')[0].lower().replace('г', 'h')
    extra = '-team' if 'команди' in t else ('-donor' if 'донатор' in t else ('-guardian' if t.endswith('Опікун') else ''))
    return 'flow-' + j + extra

# ---------- вузли flows → сторінки вайрфреймів ----------
# Наведення на вузол показує прев'ю його сторінки, клік — відкриває її.
# Екран — файл з підпису («Вхід · login.html»). Стан — сторінка стану екрана, якому він належить:
# завантаження сторінки веде до свого екрана через одну розвилку («Дані прийшли?» → екран), завантаження
# після відправки (оплата, лист) — екрана, з якого відправили; помилка, порожній стан, успіх і «стан:» —
# екрана найближчого попереднього завантаження чи екрана (стрілки «назад…» не рахуються).
# Сторінки немає — вузол без прев'ю. Виняток задає рядок у mermaid-коді: %% сторінка ВУЗОЛ файл.html (чи «—»).
WF = os.path.join(ROOT, 'wireframes')
TREE_TITLES = dict((f, t) for t, f in re.findall(r'title: "([^"]+)", href: "wireframes/([a-z-]+\.html)"', open(os.path.join(ROOT, '_nav', 'tree.js'), encoding='utf-8').read()))
SUFFIX = {'loading': '-loading', 'error': '-error', 'empty': '-empty', 'success': '-success', 'state': ''}

def node_pages(code):
    labels, cls, dec, edges, over = {}, {}, set(), [], {}
    for line in code.split('\n'):
        t = line.strip()
        m = re.match(r'%%\s*сторінка\s+(\w+)\s+(\S+)', t)
        if m: over[m.group(1)] = m.group(2); continue
        m = re.match(r'class\s+([\w,]+)\s+(\w+)$', t)
        if m:
            for n in m.group(1).split(','): cls[n] = m.group(2)
            continue
        for m in re.finditer(r'(\w+)\s*(\(\[|\[\[|\(\(|\(|\[|\{)"([^"]*)"', t):
            labels[m.group(1)] = m.group(3)
            if m.group(2) == '{': dec.add(m.group(1))
        bare = re.sub(r'(\(\[|\[\[|\(\(|\(|\[|\{)"[^"]*"(\]\)|\]\]|\)\)|\)|\]|\})', '', t)
        m = re.fullmatch(r'(\w+)\s*(?:-->|-\.->|==>)\s*(?:\|"?([^|]*?)"?\|\s*)?(\w+)', bare)
        if m: edges.append((m.group(1), m.group(3), m.group(2) or ''))
    exists = lambda f: os.path.exists(os.path.join(WF, f))
    screen = {}
    for n, l in labels.items():
        m = re.search(r'([a-z][a-z-]*)\.html', l)
        if m and cls.get(n) == 'screen': screen[n] = m.group(1)

    def back(start, stop):
        seen, q = {start}, [start]
        while q:
            nq = []
            for c in q:
                for a, b, lab in edges:
                    if b == c and a not in seen and not lab.startswith('назад'):
                        if stop(a): return a
                        seen.add(a); nq.append(a)
            q = nq

    def loading_base(n):
        for a, b, _ in edges:
            if a == n and b in dec:
                for c, d, _ in edges:
                    if c == b and d in screen: return screen[d]
        return screen.get(back(n, lambda y: y in screen))

    out = {}
    for n, l in labels.items():
        named = [f for f in re.findall(r'([a-z][a-z-]*\.html)', l) if exists(f)]
        base, c = None, cls.get(n)
        if named: out[n] = named[0]; continue
        if c == 'loading': base = loading_base(n)
        elif c in SUFFIX:
            o = back(n, lambda y: y in screen or cls.get(y) == 'loading')
            if o: base = screen[o] if o in screen else loading_base(o)
        if base and exists(base + SUFFIX[c] + '.html'): out[n] = base + SUFFIX[c] + '.html'
    for n, f in over.items():
        if f in ('—', '-'): out.pop(n, None)
        else: out[n] = f
    return out

def pages_attr(code):
    names = {s['file'][:-5]: s['name'] for g in groups for s in g['screens']}
    data = {n: ['wireframes/' + f, page_caption(f, names), f] for n, f in node_pages(code).items()}
    return html.escape(json.dumps(data, ensure_ascii=False), quote=True)

def page_caption(f, names):
    stem = f[:-5]
    base = next((b for b in sorted(names, key=len, reverse=True) if stem == b or stem.startswith(b + '-')), stem)
    name = names.get(base, base)
    return name if stem == base else f'{name} · {TREE_TITLES.get(f, stem[len(base) + 1:])}'

def flow_html(fl):
    num, name = fl['title'].split(' · ', 1)
    tail = fl['tail']
    blocks = re.split(r'\n(?=\*\*(?:Розвилки|Стани):\*\*)', tail)
    det = ''
    for b in blocks:
        hm = re.match(r'\*\*(Розвилки|Стани):\*\*\n', b)
        if hm: det += f'<div class="dcol"><h4>{hm.group(1)}</h4>{lists(b[hm.end():])}</div>'
    meta = ''.join(f'<p>{inline(x)}</p>' for x in fl['meta'].split('\n\n') if x.strip())
    dead = len(re.findall(r'class [A-Za-z0-9,]+ dead', fl['code']))
    deadc = len(re.findall(r'\(\"тупик', fl['code']))
    return (f'<article class="flow" id="{fid(fl["title"])}"><div class="fhead"><h3><span class="fnum">{esc(num)}</span> {esc(name)}</h3>'
            '<a class="tolist" href="#flow-list"><span class="i i-arrow-up" aria-hidden="true"></span>Усі flows</a></div>'
            f'<div class="fmeta">{meta}</div>'
            f'<div class="viewer" data-pages="{pages_attr(fl["code"])}"><div class="dtools" hidden><div class="dpanel" role="toolbar" aria-label="Керування схемою flow {esc(num)}">'
            '<button type="button" class="tb" data-act="out" aria-label="Зменшити" title="Зменшити (−)"><span class="i i-minus" aria-hidden="true"></span></button>'
            '<button type="button" class="tb zval" data-act="real" title="Справжній розмір, 100% (1)">100%</button>'
            '<button type="button" class="tb" data-act="in" aria-label="Збільшити" title="Збільшити (+)"><span class="i i-plus" aria-hidden="true"></span></button>'
            '<span class="dsep" aria-hidden="true"></span>'
            '<button type="button" class="tb" data-act="fit" aria-pressed="true" aria-label="Вмістити в ширину" title="Вмістити в ширину (0)"><span class="i i-arrows-width" aria-hidden="true"></span></button>'
            '<button type="button" class="tb" data-act="full" aria-label="На весь екран" title="На весь екран (F)"><span class="i i-expand" aria-hidden="true"></span></button>'
            '<span class="sr" aria-live="polite"></span>'
            '</div></div>'
            f'<div class="diagram" tabindex="0" role="region" aria-label="Діаграма flow {esc(num)}"><pre class="mermaid">{esc(fl["code"])}</pre></div></div>'
            f'<details class="fdet"><summary>Розвилки і стани словами</summary><div class="dgrid">{det}</div></details></article>')

def why():
    o = ['<div class="table-wrap" id="flow-list"><table class="why"><thead><tr><th scope="col">Flow</th><th scope="col">Чому</th></tr></thead><tbody>']
    for f_, w in why_rows:
        title = re.sub(r'\*\*', '', f_)
        anchor = next((fid(fl['title']) for fl in flows if fl['title'].replace(' — ', ' — ') == title or fl['title'] == title), None)
        cell = f'<a href="#{anchor}">{inline(f_)}</a>' if anchor else inline(f_)
        o.append(f'<tr><td>{cell}</td><td>{inline(w)}</td></tr>')
    o.append('</tbody></table></div>')
    return ''.join(o)

n_dead = len(re.findall(r'\("тупик', F))
n_rows = len(mrows)
n_orph_cols = 0
counts = [0] * (len(mh) - 1)
for r in mrows:
    for i, c in enumerate(r[1:]):
        if c == 'x': counts[i] += 1
live_cols = [c for c, s in zip(mh[1:], counts) if not c.startswith('~~')]
live_orph = sum(1 for c, s in zip(mh[1:], counts) if s == 0 and not c.startswith('~~'))
live_rows_orph = sum(1 for r in mrows if not r[0].startswith('~~') and 'x' not in r[1:])

tpl = open(TEMPLATE, encoding='utf-8').read()
out = (tpl.replace('{{TREE}}', tree())
          .replace('{{RESULT}}', inline(result)).replace('{{NAV}}', navcards())
          .replace('{{MATRIX}}', matrix())
          .replace('{{RULE}}', lists(rule))
          .replace('{{ORPH_SCREENS}}', md_table('| Екран | Навіщо існував | Дія | Що зроблено |'))
          .replace('{{ORPH_JOBS}}', md_table('| Job | Чому немає екрана | Дія | Що зроблено |'))
          .replace('{{NEAR}}', lists(near))
          .replace('{{AFTER}}', lists(after))
          .replace('{{WHY}}', why())
          .replace('{{FLOWS}}', ''.join(flow_html(f) for f in flows))
          .replace('{{LESSONS}}', lists(lessons))
          .replace('{{N_SCREENS}}', str(sum(len(g['screens']) for g in groups)))
          .replace('{{N_GROUPS}}', str(len(groups)))
          .replace('{{N_FLOWS}}', str(len(flows)))
          .replace('{{N_DEAD}}', str(n_dead))
          .replace('{{N_ROWS}}', str(n_rows - sum(1 for r in mrows if r[0].startswith('~~'))))
          .replace('{{N_ORPH}}', str(live_orph + live_rows_orph)))
open(ROOT + '/ia.html', 'w', encoding='utf-8').write(out)
print('ok', len(flows), 'flows', len(groups), 'groups', 'dead', n_dead, 'orph', live_orph, live_rows_orph)
