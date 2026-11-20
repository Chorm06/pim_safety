// InputManager — รวมการควบคุมทุกแบบไว้ที่เดียว
//   Desktop: ← → / A D เปลี่ยนเลน, ↑ / W เร่ง, ↓ / S ชะลอ
//   มือถือ: ปุ่มบนจอ (เรียก pressLeft/pressRight/setThrottle) หรือการเอียงเครื่องเพื่อเปลี่ยนเลน
// ฉากเรียก update() ทุกเฟรม แล้วอ่าน laneTarget / throttle

const MODE_KEY = 'pim_safety_control_mode';
const TILT_ON = 12; // องศาที่เอียงแล้วเปลี่ยนเลน
const TILT_OFF = 7; // ต้องกลับมาน้อยกว่านี้ก่อนจะกลับเลนกลาง (กันสั่น)
const TILT_TIMEOUT_MS = 1500; // ไม่มีค่าเซนเซอร์เข้ามาภายในเวลานี้ = ไม่รองรับ

/**
 * ขออนุญาต DeviceOrientation
 * - iOS 13+ ต้องเรียก DeviceOrientationEvent.requestPermission() จากการแตะของผู้ใช้เท่านั้น
 * - Android / Desktop ไม่ต้องขอ
 * คืนค่า 'granted' | 'denied' | 'unsupported'
 */
export async function requestTiltPermission() {
  if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') {
    return 'unsupported';
  }
  const DOE = window.DeviceOrientationEvent;
  if (typeof DOE.requestPermission === 'function') {
    try {
      const result = await DOE.requestPermission();
      return result === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }
  return 'granted';
}

/** เป็นอุปกรณ์จอสัมผัสหรือไม่ */
export function isTouchDevice() {
  try {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  } catch {
    return false;
  }
}

export function loadControlMode() {
  try {
    const v = window.localStorage.getItem(MODE_KEY);
    return v === 'tilt' ? 'tilt' : 'buttons';
  } catch {
    return 'buttons';
  }
}

export function saveControlMode(mode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* localStorage ใช้ไม่ได้: จำค่าไม่ได้แต่เล่นต่อได้ */
  }
}

export default class InputManager {
  constructor(scene, { lanes = 3, startLane = 1 } = {}) {
    this.scene = scene;
    this.lanes = lanes;
    this.laneTarget = startLane;
    this.throttle = 0; // -1 เบรก, 0 คงที่, 1 เร่ง
    this.buttonThrottle = 0;
    this.locked = false;
    this.mode = 'buttons';
    this.tilt = { raw: null, neutral: null, value: 0, zone: 0, lastEventAt: 0 };

    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys({
        left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
        a: 'A', d: 'D', w: 'W', s: 'S'
      });
      kb.on('keydown-LEFT', () => this.pressLeft());
      kb.on('keydown-A', () => this.pressLeft());
      kb.on('keydown-RIGHT', () => this.pressRight());
      kb.on('keydown-D', () => this.pressRight());
    }

    this.onOrientation = (e) => this.handleOrientation(e);
    scene.events.once('shutdown', () => this.destroy());
  }

  pressLeft() {
    if (this.locked) return;
    this.laneTarget = Math.max(0, this.laneTarget - 1);
  }

  pressRight() {
    if (this.locked) return;
    this.laneTarget = Math.min(this.lanes - 1, this.laneTarget + 1);
  }

  /** ปุ่มบนจอ เร่ง/เบรก: กดค้าง = 1/-1, ปล่อย = 0 */
  setButtonThrottle(v) {
    this.buttonThrottle = v;
  }

  // ---------- การเอียงเครื่อง ----------

  /** เปิดโหมดเอียง คืนค่า Promise<'ok'|'unsupported'> ตามว่ามีค่าเซนเซอร์เข้ามาจริงหรือไม่ */
  enableTilt() {
    this.disableTilt();
    this.mode = 'tilt';
    this.tilt.neutral = null; // ปรับศูนย์ใหม่จากท่าที่ถืออยู่ตอนเปิด
    this.tilt.zone = 0;
    this.tilt.lastEventAt = 0;
    window.addEventListener('deviceorientation', this.onOrientation);
    return new Promise((resolve) => {
      this.scene.time.delayedCall(TILT_TIMEOUT_MS, () => {
        resolve(this.tilt.lastEventAt > 0 ? 'ok' : 'unsupported');
      });
    });
  }

  disableTilt() {
    window.removeEventListener('deviceorientation', this.onOrientation);
    this.mode = 'buttons';
  }

  /** ปรับให้ท่าที่ถืออยู่ตอนนี้เป็นจุดตรงกลาง */
  calibrate() {
    this.tilt.neutral = this.tilt.raw;
  }

  handleOrientation(e) {
    if (e.beta === null && e.gamma === null) return;
    // แนวนอน: ใช้ beta (หมุนเครื่องเหมือนพวงมาลัย) กลับเครื่องหัวกลับ = กลับเครื่องหมาย
    let angle = 0;
    try {
      angle = screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : window.orientation || 0;
    } catch {
      angle = 0;
    }
    let raw;
    if (angle === 90) raw = e.beta;
    else if (angle === -90 || angle === 270) raw = -e.beta;
    else raw = e.gamma;
    if (typeof raw !== 'number' || Number.isNaN(raw)) return;

    this.tilt.raw = raw;
    this.tilt.lastEventAt = performance.now();
    if (this.tilt.neutral === null) this.tilt.neutral = raw;
    this.tilt.value = raw - this.tilt.neutral;
  }

  updateTilt() {
    const v = this.tilt.value;
    const t = this.tilt;
    // เอียงซ้าย = เลนซ้าย, ตรง = เลนกลาง, เอียงขวา = เลนขวา (มีช่วงกันสั่น)
    if (t.zone === 0) {
      if (v <= -TILT_ON) t.zone = -1;
      else if (v >= TILT_ON) t.zone = 1;
    } else if (t.zone === -1 && v > -TILT_OFF) {
      t.zone = v >= TILT_ON ? 1 : 0;
    } else if (t.zone === 1 && v < TILT_OFF) {
      t.zone = v <= -TILT_ON ? -1 : 0;
    }
    const mid = Math.floor(this.lanes / 2);
    this.laneTarget = Math.max(0, Math.min(this.lanes - 1, mid + t.zone));
  }

  update() {
    if (this.locked) {
      this.throttle = 0;
      return;
    }
    if (this.mode === 'tilt') this.updateTilt();

    let th = this.buttonThrottle;
    const k = this.keys;
    if (k) {
      if (k.up.isDown || k.w.isDown) th = 1;
      else if (k.down.isDown || k.s.isDown) th = -1;
    }
    this.throttle = th;
  }

  /** ล็อกการควบคุม (เช่น ตอนรถชะลอเข้าจุดเสี่ยง) */
  lock() {
    this.locked = true;
    this.throttle = 0;
  }

  destroy() {
    window.removeEventListener('deviceorientation', this.onOrientation);
  }
}
