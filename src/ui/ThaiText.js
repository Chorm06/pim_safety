// ตัดบรรทัดข้อความภาษาไทย (ไม่มีช่องว่างระหว่างคำ) ให้ถูกตำแหน่งคำ
// ใช้ Intl.Segmenter ถ้าเบราว์เซอร์รองรับ ถ้าไม่รองรับจะตัดตามช่องว่าง/ตัวอักษรแทน

let measureCtx = null;

function getCtx() {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  return measureCtx;
}

function cssFont(style) {
  const size = typeof style.fontSize === 'number' ? `${style.fontSize}px` : style.fontSize || '16px';
  return `${style.fontStyle || 'normal'} ${size} ${style.fontFamily || 'sans-serif'}`;
}

function segmentWords(text) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const seg = new Intl.Segmenter('th', { granularity: 'word' });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  // fallback: ตัดตามช่องว่าง (เก็บช่องว่างไว้)
  return text.split(/(\s+)/).filter(Boolean);
}

function splitGraphemes(word) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const seg = new Intl.Segmenter('th', { granularity: 'grapheme' });
    return Array.from(seg.segment(word), (s) => s.segment);
  }
  return Array.from(word);
}

/**
 * คืนข้อความที่แทรก \n แล้ว ให้แต่ละบรรทัดกว้างไม่เกิน maxWidth (px)
 * style ใช้รูปแบบเดียวกับ Phaser Text style (fontFamily, fontSize, fontStyle)
 */
export function wrapThai(text, style, maxWidth) {
  const ctx = getCtx();
  ctx.font = cssFont(style);
  const width = (s) => ctx.measureText(s).width;

  const out = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const word of segmentWords(paragraph)) {
      const test = line + word;
      if (width(test) <= maxWidth || line === '') {
        if (width(test) > maxWidth && line === '') {
          // คำเดียวยาวเกินบรรทัด: ตัดเป็นตัวอักษร
          for (const g of splitGraphemes(word)) {
            if (width(line + g) > maxWidth && line !== '') {
              out.push(line);
              line = g;
            } else {
              line += g;
            }
          }
        } else {
          line = test;
        }
      } else {
        out.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    out.push(line.trimEnd());
  }
  return out.join('\n');
}
