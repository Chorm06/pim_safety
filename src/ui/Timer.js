import Phaser from 'phaser';
import { FONT_HEADING } from '../config.js';

// CountdownTimer — logic นับถอยหลัง (ไม่มีส่วนแสดงผล) เดินด้วย delta จาก update()
// จึงหยุดเองเมื่อเกมหยุด (เช่น ถือเครื่องแนวตั้ง)
export class CountdownTimer {
  constructor(seconds, { onTick, onExpire } = {}) {
    this.total = seconds * 1000;
    this.remaining = this.total;
    this.running = false;
    this.expired = false;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.lastWhole = Math.ceil(seconds);
  }

  start() {
    this.running = true;
  }
  pause() {
    this.running = false;
  }
  resume() {
    if (!this.expired) this.running = true;
  }
  stop() {
    this.running = false;
  }

  /** วินาทีที่เหลือแบบปัดขึ้น (ใช้แสดงตัวเลข) */
  get secondsLeft() {
    return Math.max(0, Math.ceil(this.remaining / 1000));
  }

  /** สัดส่วนเวลาที่เหลือ 0–1 */
  get progress() {
    return Math.max(0, this.remaining / this.total);
  }

  update(deltaMs) {
    if (!this.running || this.expired) return;
    this.remaining -= deltaMs;
    const whole = this.secondsLeft;
    if (whole !== this.lastWhole) {
      this.lastWhole = whole;
      if (whole > 0 && this.onTick) this.onTick(whole);
    }
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.expired = true;
      this.running = false;
      if (this.onExpire) this.onExpire();
    }
  }
}

// TimerView — วงกลมใหญ่ด้านบนกลางจอ วงสีลดลงตามเวลา + ตัวเลขตรงกลาง
export class TimerView extends Phaser.GameObjects.Container {
  constructor(scene, x, y, radius = 62) {
    super(scene, x, y);
    this.radius = radius;
    this.g = scene.add.graphics();
    this.label = scene.add
      .text(0, 2, '', {
        fontFamily: FONT_HEADING,
        fontSize: `${Math.round(radius * 1.05)}px`,
        fontStyle: '700',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
        padding: { top: 8, bottom: 4 }
      })
      .setOrigin(0.5);
    this.add([this.g, this.label]);
    this.lastShown = null;
    scene.add.existing(this);
  }

  render(timer) {
    const r = this.radius;
    const p = timer.progress;
    // สีเปลี่ยนจากเขียว → เหลือง → แดง เมื่อเวลาใกล้หมด
    const color = p > 0.6 ? 0x2ecc71 : p > 0.3 ? 0xf1c40f : 0xe74c3c;
    this.g.clear();
    this.g.fillStyle(0x000000, 0.55).fillCircle(0, 0, r + 10);
    this.g.lineStyle(12, 0xffffff, 0.25).strokeCircle(0, 0, r);
    if (p > 0) {
      this.g.lineStyle(12, color, 1);
      this.g.beginPath();
      this.g.arc(0, 0, r, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * p), false);
      this.g.strokePath();
    }
    const s = timer.secondsLeft;
    if (s !== this.lastShown) {
      this.lastShown = s;
      this.label.setText(String(s));
      if (this.scene && s > 0) {
        this.label.setScale(1.25);
        this.scene.tweens.add({ targets: this.label, scale: 1, duration: 250, ease: 'Back.easeOut' });
      }
    }
  }
}
