"""Local, resumable OCR; keeps coordinates and confidence for source checking."""
import argparse
import json
from pathlib import Path
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument('pdf')
parser.add_argument('--runtime')
parser.add_argument('--start', type=int, default=1)
parser.add_argument('--end', type=int)
parser.add_argument('--output', default='tmp/pdfs/pathophysiology')
args = parser.parse_args()
if args.runtime:
    sys.path.insert(0, args.runtime)
import pymupdf as fitz
import numpy as np
from rapidocr_onnxruntime import RapidOCR

doc = fitz.open(args.pdf)
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
toc = [{'title': x[1], 'page': x[2]} for x in doc.get_toc()]
(out / 'toc.json').write_text(json.dumps(toc, ensure_ascii=False, indent=2), encoding='utf-8')
ocr = RapidOCR(intra_op_num_threads=4, inter_op_num_threads=2,
               text_score=0.1, det_box_thresh=0.3)
for number in range(args.start, min(args.end or len(doc), len(doc)) + 1):
    dest = out / f'{number:03}.json'
    if dest.exists():
        continue
    started = time.time()
    page = doc[number - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
    result, _ = ocr(arr)
    data = {'page': number, 'width': pix.width, 'height': pix.height,
            'lines': [{'box': r[0], 'text': r[1], 'confidence': r[2]} for r in (result or [])]}
    dest.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'page {number}: {len(data["lines"])} lines, {time.time()-started:.1f}s', flush=True)
