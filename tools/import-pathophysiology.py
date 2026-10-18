"""Parse locally OCR'd textbook pages; never invent missing answers."""
import json
from pathlib import Path
import re
import argparse
import hashlib

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / 'tmp/pdfs/pathophysiology'
SECOND = ROOT / 'tmp/pdfs/pathophysiology-v2'
OUTPUT = ROOT / 'tmp/pdfs/pathophysiology-parsed.json'

def clean(text):
    return text.strip().replace('．', '.').replace('【', '[').replace('】', ']')

def section(text):
    t = re.sub(r'\s', '', text).rstrip('。.')
    t = re.sub(r'[（(]要点[）)]$', '', t)
    if '参考答案' in t: return 'answers'
    if re.fullmatch(r'[\[（(]?练习题[\]）)]?', t): return 'questions'
    if re.fullmatch(r'[一二三四五六七八九十、.]*选择题', t): return 'choice'
    if re.fullmatch(r'[一二三四五六七八九十、.]*名词解释', t): return 'definition'
    if re.fullmatch(r'[一二三四五六七八九十、.]*[问简]答题', t): return 'short-answer'
    if re.fullmatch(r'[一二三四五六七八九十、.]*论述题', t): return 'essay'
    if re.fullmatch(r'[\[（(]?思考题[\]）)]?', t): return 'experiment'
    m = re.fullmatch(r'[\[（(]?([ABXＣC][1234１２３４]?)[型形]?题[\]）)]?', t)
    if m:
        k = m[1].translate(str.maketrans('１２３４', '1234'))
        return 'A' if k in ('A', 'A1', 'A2') else k

def lines(start, end):
    result = []
    for n in range(start, end):
        p = INPUT / f'{n:03}.json'
        if not p.exists(): continue
        data = json.loads(p.read_text(encoding='utf-8'))
        combined = list(data['lines'])
        other = SECOND / p.name
        if other.exists():
            extra = json.loads(other.read_text(encoding='utf-8'))
            for ln in extra['lines']:
                box = [[pt[0] / extra['width'] * data['width'], pt[1] / extra['height'] * data['height']] for pt in ln['box']]
                cx = sum(pt[0] for pt in box) / 4
                cy = sum(pt[1] for pt in box) / 4
                covered = any(min(pt[0] for pt in b['box'])-5 <= cx <= max(pt[0] for pt in b['box'])+5 and
                              min(pt[1] for pt in b['box'])-5 <= cy <= max(pt[1] for pt in b['box'])+5 for b in data['lines'])
                if not covered: combined.append(dict(ln, box=box))
        combined.sort(key=lambda x: sum(pt[1] for pt in x['box'])/4)
        rows = []
        for ln in combined:
            cy = sum(pt[1] for pt in ln['box'])/4
            if rows and abs(rows[-1][0]-cy) < data['height']*.006:
                rows[-1][1].append(ln)
            else: rows.append((cy,[ln]))
        ordered = [ln for _, row in rows for ln in sorted(row, key=lambda x:x['box'][0][0])]
        for ln in ordered:
            t = clean(ln['text'])
            y = min(pt[1] for pt in ln['box']) / data['height']
            # Running headers and page numbers are not part of the questions.
            if y < .065: continue
            if re.fullmatch(r'\d+', t) and y > .94: continue
            # Some scans place two options in one detected text line.
            parts = re.split(r'(?<=[\u4e00-\u9fff.、·：])(?=[B-E][.、])', t) if re.match(r'^[A-E][.、]', t) else [t]
            for part in parts:
                result.append({'text': part, 'page': n, 'confidence': ln['confidence'], 'box': ln['box']})
    return result

def parse_chapter(chapter, entries):
    phase, kind = None, None
    items, answers, issues = [], {}, []
    current = None
    shared_options, shared_stem = [], []
    shared_pages = []
    collecting_shared = False
    answer_lines = []

    def finish():
        nonlocal current
        if current:
            items.append(current)
        current = None

    for ln in entries:
        t = ln['text']
        sec = section(t)
        if sec:
            finish()
            if sec in ('questions', 'answers'):
                phase, kind = sec, None
            else:
                kind = sec
                shared_options, shared_stem = [], []
                shared_pages = []
                collecting_shared = False
                if sec == 'experiment': phase = 'questions'
            continue
        if phase == 'answers':
            answer_lines.append(dict(ln, kind=kind))
            continue
        if phase != 'questions' or kind not in ('A', 'A3', 'A4', 'B', 'X', 'C', 'definition', 'short-answer', 'essay', 'experiment'):
            continue
        if '共用' in t and ('题干' in t or '答案' in t or '备选' in t):
            finish()
            shared_options, shared_stem = [], []
            shared_pages = [ln['page']]
            collecting_shared = True
            continue
        opt = re.match(r'^([A-E])[.、:：\s]+\s*(.*)$', t)
        if not opt and re.match(r'^E[\u4e00-\u9fff]', t): opt = re.match(r'^(E)(.*)$', t)
        num = re.match(r'^(\d{1,3})[.、]\s*(.+)$', t)
        if num and re.match(r'^\d', num[2]) and not (current and int(num[1]) == current['number'] + 1 and len(current['options']) >= 5):
            num = None
        if num:
            finish()
            current = {'number': int(num[1]), 'kind': kind, 'question': num[2],
                       'options': list(shared_options),
                       'stem': ''.join(shared_stem), 'page': ln['page'], 'pages': list(dict.fromkeys(shared_pages + [ln['page']])),
                       'confidence': ln['confidence']}
            collecting_shared = False
        elif opt:
            val = opt[1] + '. ' + opt[2]
            if collecting_shared and (opt[1] == 'A' or shared_options):
                shared_options.append(val)
            elif collecting_shared:
                shared_stem.append(t)
            elif current:
                current['options'].append(val)
                if ln['page'] not in current['pages']: current['pages'].append(ln['page'])
        elif collecting_shared:
            if ln['page'] not in shared_pages: shared_pages.append(ln['page'])
            if shared_options:
                shared_options[-1] += t
            else:
                shared_stem.append(t)
        elif current:
            if re.fullmatch(r'[（(][\u4e00-\u9fff\s]{2,15}[）)]', t): continue
            if current['options'] and not shared_options:
                current['options'][-1] += t
            else:
                current['question'] += t
            current['confidence'] = min(current['confidence'], ln['confidence'])
            if ln['page'] not in current['pages']: current['pages'].append(ln['page'])
        elif kind in ('definition', 'short-answer', 'essay', 'experiment') and not re.match(r'^第.{1,5}章', t):
            current = {'number': 1, 'kind': kind, 'question': t, 'options': [], 'stem': '',
                       'page': ln['page'], 'pages': [ln['page']], 'confidence': ln['confidence']}
    finish()
    for item in items:
        split_options = []
        for option in item['options']:
            for fragment in re.split(r'(?<![A-Za-z])(?=[B-E][.、])', option):
                if fragment.strip():
                    value = fragment.strip().rstrip('.、·： ')
                    value = re.sub(r'^([A-E])[.、]\s*', r'\1. ', value)
                    split_options.append(value)
        item['options'] = list(dict.fromkeys(split_options))

    # Objective answer keys may contain many answers on one printed line.
    objective_rows = []
    for ln in answer_lines:
        if objective_rows and objective_rows[-1]['kind'] == ln['kind'] and objective_rows[-1]['page'] == ln['page']:
            objective_rows[-1]['text'] += ' ' + ln['text']
        else: objective_rows.append(dict(ln))
    for ln in objective_rows:
        kind = ln['kind']
        if kind not in ('A', 'A3', 'A4', 'B', 'C', 'X'): continue
        for match in re.finditer(r'(\d{1,3})\s*[.、:：]?\s*([A-E](?:\s*[,，、]?\s*[A-E])*)(?=[^A-Za-z]|$)', ln['text']):
            key = (kind, int(match[1]))
            value = list(dict.fromkeys(re.findall('[A-E]', match[2])))
            if key in answers and answers[key]['correctAnswers'] != value:
                issues.append({'type': 'conflicting-answer', 'key': list(key)})
            answers[key] = {'correctAnswers': value, 'answerPages': [ln['page']]}

    # Visually checked against the scanned answer tables (PDF pages retained).
    verified = {6: [('A', 12, 'A', 54, 312)], 13: [('A', 54, 'E', 121, 154)],
                15: [('A', 16, 'A', 140, None)], 18: [('B', 2, 'E', 171, 32)],
                19: [('A', 12, 'C', 182, 112)]}
    for kind, number, value, page, misread in verified.get(chapter['number'], []):
        if misread: answers.pop((kind, misread), None)
        answers[(kind, number)] = {'correctAnswers': [value], 'answerPages': [page]}

    # Open-ended answers stay as source text, with source pages for diagrams/tables.
    for kind in ('definition', 'short-answer', 'essay'):
        rows = [x for x in answer_lines if x['kind'] == kind]
        known = {x['number']: x for x in items if x['kind'] == kind}
        number = None
        for ln in rows:
            t = ln['text']
            m = re.match(r'^(\d{1,3})[.、]\s*(.+)$', t)
            if m and re.match(r'^\d', m[2]): m = None
            if m and int(m[1]) in known and (number is None or int(m[1]) > number):
                number = int(m[1])
                answers[(kind, number)] = {'referenceAnswer': m[2], 'answerPages': [ln['page']]}
            else:
                if number is None and len(known) == 1:
                    number = next(iter(known))
                    answers[(kind, number)] = {'referenceAnswer': '', 'answerPages': []}
                if number is not None:
                    a = answers[(kind, number)]
                    a['referenceAnswer'] += '\n' + t
                    if ln['page'] not in a['answerPages']: a['answerPages'].append(ln['page'])

    seen = set()
    for item in items:
        key = (item['kind'], item['number'])
        if key in seen: issues.append({'type': 'duplicate-number', 'key': list(key)})
        seen.add(key)
        item.update(answers.get(key, {}))
        item['chapter'] = chapter['title']
        item['chapterNumber'] = chapter['number']
        if item['options']:
            letters = [o[0] for o in item['options']]
            if letters != list('ABCDE'): issues.append({'type': 'options', 'key': list(key), 'letters': letters})
            if not item.get('correctAnswers'): issues.append({'type': 'missing-answer', 'key': list(key)})
            elif item['kind'] != 'X' and len(item['correctAnswers']) != 1: issues.append({'type': 'ambiguous-answer', 'key': list(key)})
        elif item['kind'] not in ('definition', 'short-answer', 'essay', 'experiment'):
            issues.append({'type': 'missing-options', 'key': list(key)})
        elif item['kind'] != 'experiment' and not item.get('referenceAnswer'):
            issues.append({'type': 'missing-reference', 'key': list(key)})
    return {'chapter': chapter, 'items': items, 'issues': issues,
            'answerKeys': [{'kind': k[0], 'number': k[1], **v} for k, v in answers.items()]}

def parse_experiments(chapter, entries):
    items = []
    active = False
    experiment = ''
    current = None
    for ln in entries:
        t = ln['text']
        if re.match(r'^实验[一二三四五六七八九十]+', t):
            experiment = t
            active = False
            current = None
        if section(t) == 'experiment' or '讨论内容' in t:
            active = True
            current = None
            continue
        if not active: continue
        if t.startswith('[') or t.startswith('附录') or re.fullmatch(r'[（(][\u4e00-\u9fff\s]{2,15}[）)]', t):
            active = False
            current = None
            continue
        m = re.match(r'^[（(]?(\d{1,2})[.、）)]\s*(.+)$', t)
        if m:
            current = {'number': len(items)+1, 'sourceNumber': int(m[1]), 'kind': 'experiment',
                       'question': m[2], 'experiment': experiment, 'page': ln['page'], 'pages': [ln['page']],
                       'chapter': chapter['title'], 'chapterNumber': 21, 'options': [], 'stem': '',
                       'referenceAnswer': '原书未提供本题独立参考答案，请结合本节实验原理与观察结果自评。',
                       'answerPages': [ln['page']], 'confidence': ln['confidence']}
            items.append(current)
        elif current:
            current['question'] += t
            if ln['page'] not in current['pages']: current['pages'].append(ln['page'])
    return {'chapter': chapter, 'items': items, 'issues': [], 'answerKeys': []}

def export(results, pdf, runtime):
    assert len(results) == 21, 'All chapters must be parsed before export'
    assert all((SECOND/f'{n:03}.json').exists() for n in range(8,226)), 'Second OCR pass incomplete'
    assert not any(c['issues'] for c in results), 'Resolve every structural issue before export'
    questions = []
    chapter_counts = []
    for c in results:
        for kind in set(q['kind'] for q in c['items']):
            ns = {q['number'] for q in c['items'] if q['kind'] == kind}
            assert ns == set(range(1, max(ns)+1)), (c['chapter']['number'], kind, 'missing numbers')
        known = {(q['kind'],q['number']) for q in c['items']}
        assert all((a['kind'], a['number']) in known for a in c['answerKeys']), 'Unmatched answer key'
        count = {'chapter': c['chapter']['title'], 'objective': 0, 'subjective': 0}
        for q in c['items']:
            subjective = q['kind'] in ('definition', 'short-answer', 'essay', 'experiment')
            count['subjective' if subjective else 'objective'] += 1
            chapter = re.sub(r'^(第.+?章)\s*', r'\1 ', q['chapter']).rstrip('.')
            text = (q['stem'] + '\n' if q['stem'] else '') + q['question']
            if q.get('experiment'): text = q['experiment'] + '\n' + text
            item = {'id': f"pathophysiology-ch{q['chapterNumber']:02}-{q['kind']}-{q['number']:03}",
                    'subject': '病理生理学', 'subjectId': 'pathophysiology', 'difficulty': 'common',
                    'questionType': 'subjective' if subjective else ('multiple' if len(q['correctAnswers']) > 1 else 'single'),
                    'sourceType': q['kind'], 'studyOnly': subjective, 'question': text,
                    'options': q['options'], 'correctAnswers': [] if subjective else q['correctAnswers'],
                    'chapter': chapter, 'knowledgePoint': chapter.split(' ',1)[-1],
                    'tags': ['病理生理学', q['kind']], 'sourcePages': q['pages'],
                    'answerPages': q.get('answerPages', []),
                    'textbookReference': f"《病理生理学学习指导与习题集》第2版，{chapter}，原书第{q['page']-7}页（PDF第{q['page']}页）"}
            if subjective:
                item['referenceAnswer'] = q['referenceAnswer']
                item['explanation'] = q['referenceAnswer']
            else:
                correct_text = [o[3:] for o in q['options'] if o[0] in q['correctAnswers']]
                item['explanation'] = '原书答案：' + '；'.join(correct_text) + '。原书未提供逐项解析，可对照来源页复核。'
            questions.append(item)
        chapter_counts.append(count)
    assert len({q['id'] for q in questions}) == len(questions)
    target = ROOT/'src/modules/question-bank/subjects/pathophysiology.js'
    target.write_text("/** 病理生理学：扫描原书提取；导入审计见 docs/review/pathophysiology-import.json */\n(function() {\n  var MediCard = window.MediCard || {};\n  MediCard.QuestionBank = MediCard.QuestionBank || {};\n  MediCard.QuestionBank['pathophysiology'] = " + json.dumps(questions,ensure_ascii=False,indent=2) + ";\n  window.MediCard = MediCard;\n})();\n", encoding='utf-8')
    manifest = {'source': Path(pdf).name, 'sourceSha256': hashlib.sha256(Path(pdf).read_bytes()).hexdigest(),
                'total': len(questions), 'objective': sum(not q['studyOnly'] for q in questions),
                'subjective': sum(q['studyOnly'] for q in questions), 'chapters': chapter_counts,
                'structuralIssues': [], 'notes': ['实验二原书没有思考题；实验八讨论内容按主观题收录。',
                  '实验思考题原书未提供独立参考答案；保留来源页并明确标注。',
                  'OCR完成两遍识别与结构校验；保留原书页面供核对公式、单位和上下标。']}
    (ROOT/'docs/review/pathophysiology-import.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    # Source pages preserve formulas, tables and superscripts that OCR can lose.
    import sys
    if runtime: sys.path.insert(0,runtime)
    import pymupdf as fitz
    from PIL import Image
    doc = fitz.open(pdf)
    pages = sorted({p for q in questions for p in q['sourcePages'] + q['answerPages']})
    asset_dir = ROOT/'src/assets/pathophysiology'
    asset_dir.mkdir(parents=True,exist_ok=True)
    for n in pages:
        if (asset_dir/f'page-{n:03}.webp').exists(): continue
        pix = doc[n-1].get_pixmap(matrix=fitz.Matrix(2.5,2.5),alpha=False)
        Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(asset_dir/f'page-{n:03}.webp',quality=88)
    print(json.dumps({k:manifest[k] for k in ('total','objective','subjective')}) + f', source pages: {len(pages)}')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--export', action='store_true')
    parser.add_argument('--pdf')
    parser.add_argument('--runtime')
    args = parser.parse_args()
    toc = json.loads((INPUT / 'toc.json').read_text(encoding='utf-8'))
    chapters = [dict(x, number=i+1) for i, x in enumerate(x for x in toc if x['title'].startswith('第'))]
    results = []
    for i, ch in enumerate(chapters):
        end = chapters[i+1]['page'] if i+1 < len(chapters) else 226
        # Only process complete chapters during resumable OCR.
        if not all((INPUT/f'{n:03}.json').exists() for n in range(ch['page'], end)): continue
        result = (parse_experiments if ch['number'] == 21 else parse_chapter)(ch, lines(ch['page'], end))
        results.append(result)
        print(f"chapter {ch['number']}: {len(result['items'])} questions, {len(result['issues'])} issues")
    OUTPUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    if args.export:
        assert args.pdf, '--pdf is required for export'
        export(results, args.pdf, args.runtime)

if __name__ == '__main__': main()
