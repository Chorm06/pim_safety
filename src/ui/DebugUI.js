// ปุ่ม/ข้อความเล็กสำหรับโหมด Debug เท่านั้น (ผู้เล่นจริงไม่เห็น จึงไม่ต้องใหญ่ 88px)

export function debugButton(scene, x, y, label, onClick, { depth = 2000, origin = 0 } = {}) {
  const t = scene.add
    .text(x, y, label, {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#1d4ed8',
      padding: { left: 12, right: 12, top: 8, bottom: 6 }
    })
    .setOrigin(origin)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });
  t.on('pointerover', () => !t.disabled && t.setBackgroundColor('#2563eb'));
  t.on('pointerout', () => !t.disabled && t.setBackgroundColor(t.activeOn ? '#b45309' : '#1d4ed8'));
  t.on('pointerup', (p, lx, ly, e) => {
    e && e.stopPropagation && e.stopPropagation();
    if (!t.disabled) onClick();
  });
  t.setActiveState = (on) => {
    t.activeOn = on;
    t.setBackgroundColor(on ? '#b45309' : '#1d4ed8');
    return t;
  };
  t.setDisabled = (off) => {
    t.disabled = off;
    t.setBackgroundColor(off ? '#555555' : '#1d4ed8').setAlpha(off ? 0.6 : 1);
    return t;
  };
  return t;
}

export function debugLabel(scene, x, y, text, { depth = 2000 } = {}) {
  return scene.add
    .text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#00ffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { left: 8, right: 8, top: 4, bottom: 4 }
    })
    .setDepth(depth);
}

/** คัดลอกข้อความลงคลิปบอร์ด (รองรับเบราว์เซอร์ที่ไม่มี navigator.clipboard) */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* ลองวิธีสำรอง */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** ข้อความแจ้งสั้นๆ กลางล่างจอ */
export function debugToast(scene, text, ms = 2200) {
  const t = scene.add
    .text(640, 640, text, {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.85)',
      padding: { left: 16, right: 16, top: 10, bottom: 8 }
    })
    .setOrigin(0.5)
    .setDepth(3000);
  scene.time.delayedCall(ms, () => t.destroy());
}
