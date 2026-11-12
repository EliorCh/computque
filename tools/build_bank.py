#!/usr/bin/env python3
"""Build bank.js for the computability practice site from the past-exam boxes
in the summary site (../computsum/index.html). Re-run after editing computsum.
usage: python3 tools/build_bank.py [path/to/computsum/index.html]"""
import re, sys, json, os
from bs4 import BeautifulSoup

FORCE = '--force' in sys.argv
sys.argv = [a for a in sys.argv if a != '--force']
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..', 'computsum', 'index.html')
OUT = os.path.join(os.path.dirname(__file__), '..', 'bank.js')
soup = BeautifulSoup(open(SRC, encoding='utf-8').read(), 'html.parser')

TOPICS = {  # summary chapter id -> (topic key, label, chapter number)
    'ch3': ('meta', 'מטה-תכנות', 3), 'ch4': ('compare', 'השוואה בין שפות', 4), 'chF': ('flang', 'שפת F', 6),
    'chRC': ('rc', 'שפות מלאות-סבירות', 7), 'chComp': ('comp', 'פונקציות חשיבות ולא חשיבות', 8),
    'chDec': ('dec', 'בעיות הכרעה: R, RE, coRE', 9), 'chRed': ('red', 'רדוקציות ומשפט רייס', 10),
    'chTM': ('tm', 'מכונות טיורינג', 11),
}
EXAMS = [('20A', '2019/20 מועד א'), ('20B', '2019/20 מועד ב'), ('21A', '2020/21 מועד א'),
         ('25A', '2024/25 מועד א'), ('26A', '2025/26 מועד א')]
LETTERS = 'אבגדהוזח'

def inner(el):
    return ''.join(str(c) for c in el.contents).strip()

def split_details(nodes):
    """nodes -> (question html, [hint html], solution html or None)"""
    q, hints, sol = [], [], None
    for n in nodes:
        if getattr(n, 'name', None) == 'details' and 'sol' in (n.get('class') or []):
            summ = n.find('summary'); label = summ.get_text(strip=True) if summ else ''
            summ and summ.extract()
            if label.startswith('פתרון'): sol = inner(n)
            else: hints.append({'label': label or 'רמז', 'html': inner(n)})
        else:
            s = str(n).strip()
            if s: q.append(s)
    return '\n'.join(q), hints, sol

def exam_of(tag, ctx):
    for code, lab in EXAMS:
        y, m = lab.split(' מועד ')
        if y in tag and ('מועד ' + m) in tag: return code
    if 'שאלה סגורה' in tag and '2024/25' in ctx: return '25A'
    return None

questions = []
for h2 in soup.select('h2[id$="-exams"]'):
    cid = h2['id'][:-6]
    if cid not in TOPICS: continue
    topic = TOPICS[cid][0]
    ctx = ''
    for sib in h2.find_next_siblings():
        if sib.name == 'h2': break
        if sib.name in ('h3', 'p'): ctx = sib.get_text(' ', strip=True) + ' ' + ctx[:200]
        if not (sib.name == 'div' and 'exercise' in (sib.get('class') or [])): continue
        tag = sib.select_one('.box-h .tag').get_text(' ', strip=True)
        title_el = sib.select_one('.box-h .ht')
        exam = exam_of(tag, ctx)
        if not exam: print('skip (no exam):', tag); continue
        num = re.sub(r'^.*שאלה\s*', '', tag).strip()
        part_of = re.search(r'חלק (ראשון|שני)', tag)
        label = (('חלק ' + part_of.group(1) + ' · ') if part_of else '') + ('שאלה ' + num if num != 'סגורה' else 'שאלה סגורה')
        body = sib.select_one('.box-body')
        kids = [c for c in body.contents if not (isinstance(c, str) and not c.strip())]
        intro_nodes, parts = [], []
        for c in kids:
            if getattr(c, 'name', None) == 'div' and 'part' in (c.get('class') or []):
                ph = c.find('p', class_='ph'); plabel = None
                if ph:
                    plabel = ph.get_text(' ', strip=True).split(':')[0].strip()
                qh, hints, sol = split_details(c.contents)
                parts.append({'label': plabel, 'q': qh, 'hints': hints, 'sol': sol})
            else:
                intro_nodes.append(c)
        iq, ihints, isol = split_details(intro_nodes)
        q = {'exam': exam, 'num': num, 'label': label, 'half': (2 if part_of and part_of.group(1) == 'שני' else 1), 'topic': topic, 'title': inner(title_el), 'intro': iq if parts else ''}
        if not parts:
            parts = [{'label': None, 'q': iq, 'hints': ihints, 'sol': isol}]
        elif ihints or isol:
            q['introHints'] = ihints
        # closed question: an ordered option list + "תשובה X" in the solution
        pick = lambda fr: ([o for o in fr.find_all('ol') if 'hebrew' in (o.get('style') or '')] or [None])[-1]
        ol = pick(BeautifulSoup(parts[0]['q'], 'html.parser')) if len(parts) == 1 else None
        m = re.search(r'תשובה\s+([א-ח])', BeautifulSoup(parts[0]['sol'] or '', 'html.parser').get_text()) if len(parts) == 1 else None
        if ol and m:
            frag = BeautifulSoup(parts[0]['q'], 'html.parser'); ol2 = pick(frag)
            q['options'] = [inner(li) for li in ol2.find_all('li', recursive=False)]
            q['correct'] = LETTERS.index(m.group(1)); ol2.decompose()
            parts[0]['q'] = str(frag).strip(); q['type'] = 'mcq'
        else:
            q['type'] = 'open'
        q['parts'] = parts
        questions.append(q)

# 2025/26 Q2 is the last part of 2020/21 Q1 (A_d) on its own: build it self-contained
src = next((q for q in questions if q['exam'] == '21A' and 'A<sub>d</sub>' in q['title']), None)
if src and not any(q['exam'] == '26A' and q['num'] == '2' for q in questions):
    last = dict(src['parts'][-1]); intro = re.sub(r'<p>\(שאלה כמעט זהה[\s\S]*?</p>', '', src['intro']).strip()
    last['label'] = None
    questions.append({'exam': '26A', 'num': '2', 'label': 'שאלה 2', 'topic': src['topic'], 'type': 'open',
                      'title': 'הקבוצה <span class="ltr nw">A<sub>d</sub></span>', 'intro': intro, 'parts': [last]})

order = {c: i for i, (c, _) in enumerate(EXAMS)}
def numkey(n):
    m = re.match(r'(\d+)', n); return (int(m.group(1)) if m else 99, n)
seen = {}
for q in sorted(questions, key=lambda q: (order[q['exam']], q.get('half', 1), numkey(q['num']))):
    base = q['exam'] + '-' + (('p%d-' % q['half']) if q['exam'] == '21A' else '') + ('c' if q['num'] == 'סגורה' else '') + (re.sub(r'\W+', '', q['num'].replace('סגורה', '')) or '')
    if base.endswith('-c'): base += ''
    seen[base] = seen.get(base, 0) + 1
    q['id'] = base + (str(seen[base]) if base.endswith('-c') else ('' if seen[base] == 1 else '-' + str(seen[base])))
questions.sort(key=lambda q: (order[q['exam']], q.get('half', 1), numkey(q['num'])))
for q in questions:
    pts = re.search(r'\((\d+)\s*נק', BeautifulSoup(q['title'], 'html.parser').get_text())
    q['points'] = int(pts.group(1)) if pts else None
    q['title'] = re.sub(r'\s*\(\d+\s*נק[^)]*\)\s*$', '', q['title']).strip()

bank = {'exams': [{'code': c, 'label': l, 'n': sum(1 for q in questions if q['exam'] == c)} for c, l in EXAMS],
        'topics': [{'key': k, 'label': lab, 'ch': ch, 'sum': cid} for cid, (k, lab, ch) in TOPICS.items()],
        'questions': questions}
if os.path.exists(OUT) and not FORCE:
    sys.exit('bank.js already exists and may hold fixes made from the ops page. Run with --force to rebuild it from computsum anyway.')
open(OUT, 'w', encoding='utf-8').write('/* first built by tools/build_bank.py from computsum; now edited directly (ops page) */\nwindow.BANK=' + json.dumps(bank, ensure_ascii=False) + ';\n')
print(len(questions), 'questions →', OUT)
for q in questions: print(' ', q['id'], q['type'], q['topic'], len(q['parts']), 'parts', BeautifulSoup(q['title'],'html.parser').get_text()[:40], q['points'])
