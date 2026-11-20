import Phaser from 'phaser';
import { CONFIG, MIN_TOUCH_SIZE } from '../config.js';
import { imageKey } from '../systems/Assets.js';
import { addContainImage, imageToScreen } from '../ui/ImageFit.js';
import { goTo, nextAfterLesson, setScreenReaderText } from '../systems/GameFlow.js';

// ตำแหน่งปุ่ม "NEXT ▸▸" ที่อยู่ในภาพ lesson.jpg แล้ว (สัดส่วน 0–1 ของภาพ วัดจากทั้ง 2 ข้อ)
// วางพื้นที่กดโปร่งใสทับ + ขยายให้ไม่เล็กกว่า 88 px
const NEXT_BUTTON_AREA = { x1: 0.262, y1: 0.725, x2: 0.428, y2: 0.82 };

export default class LessonScene extends Phaser.Scene {
  constructor() {
    super('LessonScene');
  }

  init(data) {
    this.index = data && Number.isInteger(data.index) ? data.index : 0;
    this._leaving = false;
  }

  create() {
    this.sc = this.registry.get('scenarios')[this.index];
    // พื้นหลังสีเดียวกับโทนการ์ด เผื่อขอบว่างจากการแสดงแบบ contain
    this.cameras.main.setBackgroundColor('#1b2a55');
    this.cameras.main.fadeIn(350, 0, 0, 0);

    this.img = addContainImage(this, imageKey(this.sc.id, 'lesson'));
    // ข้อความอยู่ในภาพแล้ว: เก็บ lesson_text เป็น alt text ให้โปรแกรมอ่านหน้าจอ
    setScreenReaderText(this.sc.lesson_text);

    this.createNextZone();
    this.input.keyboard?.on('keydown-ENTER', () => this.onNext());
    this.input.keyboard?.on('keydown-SPACE', () => this.onNext());
  }

  createNextZone() {
    const a = imageToScreen(this.img, NEXT_BUTTON_AREA.x1, NEXT_BUTTON_AREA.y1);
    const b = imageToScreen(this.img, NEXT_BUTTON_AREA.x2, NEXT_BUTTON_AREA.y2);
    const w = b.x - a.x;
    const h = b.y - a.y;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;

    const glow = this.add.graphics();
    glow.lineStyle(5, 0xffe066, 1).strokeRoundedRect(cx - w / 2 - 6, cy - h / 2 - 6, w + 12, h + 12, 14);
    glow.setAlpha(0);
    // ให้อ่านก่อนสักครู่ แล้วค่อยกระพริบบอกปุ่ม
    this.tweens.add({ targets: glow, alpha: { from: 0, to: 0.9 }, duration: 800, yoyo: true, repeat: -1, delay: 1500, ease: 'Sine.easeInOut' });

    const zone = this.add.zone(cx, cy, Math.max(w + 12, MIN_TOUCH_SIZE), Math.max(h + 12, MIN_TOUCH_SIZE)).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.onNext());

    if (CONFIG.DEBUG) this.add.rectangle(cx, cy, zone.width, zone.height).setStrokeStyle(2, 0x00ffff);
  }

  onNext() {
    // TODO Step 5: บันทึก save ที่นี่
    const next = nextAfterLesson(this, this.index);
    goTo(this, next.key, next.data);
  }
}
