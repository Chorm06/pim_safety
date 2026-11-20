import Phaser from 'phaser';
import { INTRO_KEY } from '../systems/Assets.js';
import { addCoverImage, imageToScreen } from '../ui/ImageFit.js';
import { requestTiltPermission, isTouchDevice } from '../systems/InputManager.js';
import { CONFIG, MIN_TOUCH_SIZE } from '../config.js';
import { unlockAudio } from '../systems/AudioManager.js';
import { FLOW, goTo, setScreenReaderText } from '../systems/GameFlow.js';

// ตำแหน่งปุ่ม "เริ่มต้นการทดสอบ" ที่อยู่ในภาพ intro.jpg อยู่แล้ว (สัดส่วน 0–1 ของภาพ)
// วางพื้นที่กดโปร่งใสทับปุ่มในภาพ แทนการวาดปุ่มซ้ำ
const START_BUTTON_AREA = { x1: 0.295, y1: 0.755, x2: 0.705, y2: 0.932 };

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  create() {
    this.starting = false;
    this._leaving = false;
    setScreenReaderText('PIM Safety Challenge');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.bg = addCoverImage(this, INTRO_KEY);
    this.createStartZone();

    // Desktop: กด Enter / Space เพื่อเริ่มได้
    this.input.keyboard?.on('keydown-ENTER', () => this.onStart());
    this.input.keyboard?.on('keydown-SPACE', () => this.onStart());

    // TODO Step 5: ถ้ามี save ที่ยังไม่หมดอายุ แสดงปุ่ม "เล่นต่อ (ข้อ N)" และ "เริ่มใหม่"
  }

  createStartZone() {
    const a = imageToScreen(this.bg, START_BUTTON_AREA.x1, START_BUTTON_AREA.y1);
    const b = imageToScreen(this.bg, START_BUTTON_AREA.x2, START_BUTTON_AREA.y2);
    const w = Math.max(b.x - a.x, MIN_TOUCH_SIZE);
    const h = Math.max(b.y - a.y, MIN_TOUCH_SIZE);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;

    // กรอบเรืองแสงกระพริบเบาๆ บอกว่ากดตรงนี้ได้
    const glow = this.add.graphics();
    glow.lineStyle(6, 0xffe066, 1).strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 18);
    glow.setAlpha(0);
    this.tweens.add({ targets: glow, alpha: { from: 0, to: 0.85 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => this.bg.setTint(0xf2f2f2));
    zone.on('pointerout', () => this.bg.clearTint());
    zone.on('pointerup', () => this.onStart());

    if (CONFIG.DEBUG) {
      this.add.rectangle(cx, cy, w, h).setStrokeStyle(2, 0x00ffff);
    }
  }

  async onStart() {
    if (this.starting) return;
    this.starting = true;
    unlockAudio(); // iOS: ต้องปลดล็อกเสียงจากการแตะของผู้ใช้

    // จังหวะแตะครั้งแรก = จังหวะขออนุญาตเซนเซอร์เอียงบน iOS
    // ถ้าไม่อนุญาต จะใช้ปุ่มบนจอแทน (ระบบเลือกโหมดทำใน Step 4)
    if (isTouchDevice()) {
      const tilt = await requestTiltPermission();
      this.registry.set('tiltPermission', tilt);
    } else {
      this.registry.set('tiltPermission', 'unsupported');
    }

    this.registry.set('results', []);
    goTo(this, FLOW.afterIntro, { index: 0 });
  }
}
