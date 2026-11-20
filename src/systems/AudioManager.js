// AudioManager — เสียงเอฟเฟกต์แบบสังเคราะห์ด้วย Web Audio API (ยังไม่มีไฟล์เสียงจริง)
// Step 5 จะเพิ่มการตรวจไฟล์เสียงจริงและปุ่มเปิด/ปิดเสียง
// ทุกฟังก์ชันห่อ try/catch: ถ้าเบราว์เซอร์ไม่รองรับ ให้เงียบไปโดยไม่ error

let ctx = null;

function getCtx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** เรียกจากการแตะ/คลิกของผู้ใช้ครั้งแรก (iOS ต้องปลดล็อกเสียงจาก gesture) */
export function unlockAudio() {
  getCtx();
}

function tone(ac, { freq, to, dur, type = 'sine', vol = 0.2, delay = 0 }) {
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(ac, { dur, vol = 0.4 }) {
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  src.buffer = buf;
  gain.gain.value = vol;
  src.connect(gain).connect(ac.destination);
  src.start();
}

export function playSfx(name) {
  const ac = getCtx();
  if (!ac) return;
  try {
    switch (name) {
      case 'tick':
        tone(ac, { freq: 1100, dur: 0.06, type: 'square', vol: 0.06 });
        break;
      case 'tickLast':
        tone(ac, { freq: 1500, dur: 0.12, type: 'square', vol: 0.08 });
        break;
      case 'correct':
        tone(ac, { freq: 660, dur: 0.15, type: 'triangle', vol: 0.25 });
        tone(ac, { freq: 990, dur: 0.3, type: 'triangle', vol: 0.25, delay: 0.13 });
        break;
      case 'wrong':
        tone(ac, { freq: 260, to: 140, dur: 0.35, type: 'sawtooth', vol: 0.12 });
        break;
      case 'crash':
        noise(ac, { dur: 0.6, vol: 0.5 });
        tone(ac, { freq: 120, to: 40, dur: 0.5, type: 'sine', vol: 0.4 });
        break;
      default:
        break;
    }
  } catch {
    /* เงียบไว้ */
  }
}
