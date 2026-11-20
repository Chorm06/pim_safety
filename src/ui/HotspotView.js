import Phaser from 'phaser';
import { imageToScreen } from './ImageFit.js';
import { FONT_HEADING, MIN_TOUCH_SIZE } from '../config.js';

const RED = 0xe60000;

// วงรีขอบแดง + ตัวอักษร A/B/C วางทับภาพ choices.jpg ตามพิกัด hotspot (สัดส่วน 0–1 ของภาพ)
// พื้นที่กดเป็นวงรี และไม่เล็กกว่า 88×88 px
export default class HotspotView {
  constructor(scene, img, choice, onSelect) {
    this.scene = scene;
    this.img = img;
    this.key = choice.key;
    this.hotspot = { ...choice.hotspot };
    this.onSelect = onSelect;

    this.ring = scene.add.graphics().setDepth(10);
    this.letter = scene.add
      .text(0, 0, choice.key, {
        fontFamily: FONT_HEADING,
        fontSize: '56px',
        fontStyle: '700',
        color: '#e60000',
        stroke: '#ffffff',
        strokeThickness: 8,
        padding: { top: 8, bottom: 4 }
      })
      .setOrigin(0.5, 1)
      .setDepth(11);

    this.zone = scene.add.zone(0, 0, 10, 10).setDepth(12);
    this.zone.on('pointerup', () => this.onSelect && this.onSelect(this.key));
    this.zone.on('pointerover', () => this.setHighlight(true));
    this.zone.on('pointerout', () => this.setHighlight(false));

    this.layout();

    // กระพริบวงเบาๆ ให้รู้ว่ากดได้
    this.pulse = scene.tweens.add({
      targets: [this.ring],
      alpha: { from: 1, to: 0.55 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /** ขนาด/ตำแหน่งบนจอ (px) จาก hotspot */
  get screenRect() {
    const c = imageToScreen(this.img, this.hotspot.x, this.hotspot.y);
    return { x: c.x, y: c.y, w: this.hotspot.w * this.img.displayWidth, h: this.hotspot.h * this.img.displayHeight };
  }

  layout(highlight = false) {
    const { x, y, w, h } = this.screenRect;
    this.ring.clear();
    if (highlight) this.ring.fillStyle(RED, 0.15).fillEllipse(x, y, w, h);
    this.ring.lineStyle(10, 0xffffff, 0.6).strokeEllipse(x, y, w, h); // ขอบขาวบางๆ ให้เห็นบนพื้นสีเข้ม
    this.ring.lineStyle(6, RED, 1).strokeEllipse(x, y, w, h);

    this.letter.setPosition(x - w * 0.32, y - h * 0.42);

    const zw = Math.max(w, MIN_TOUCH_SIZE);
    const zh = Math.max(h, MIN_TOUCH_SIZE);
    this.zone.setPosition(x, y).setSize(zw, zh);
    if (this.zone.input) {
      this.zone.input.hitArea.setTo(zw / 2, zh / 2, zw, zh);
    } else {
      this.zone.setInteractive(new Phaser.Geom.Ellipse(zw / 2, zh / 2, zw, zh), Phaser.Geom.Ellipse.Contains);
      this.zone.input.cursor = 'pointer';
    }
  }

  setHighlight(on) {
    if (!this.removed) this.layout(on);
  }

  setHotspot(h) {
    this.hotspot = { ...h };
    this.layout();
  }

  setEnabled(on) {
    if (this.zone.input) this.zone.input.enabled = on;
  }

  /** ตอบถูก: วงเปลี่ยนเป็นสีเขียวแล้วขยาย */
  flashCorrect() {
    this.pulse.stop();
    const { x, y, w, h } = this.screenRect;
    this.ring.setAlpha(1).clear();
    this.ring.fillStyle(0x2ecc71, 0.25).fillEllipse(x, y, w, h);
    this.ring.lineStyle(8, 0x2ecc71, 1).strokeEllipse(x, y, w, h);
    this.letter.setColor('#1e9e4f');
  }

  /** ตอบผิดแล้วกดลองใหม่: วงหายไป (ไม่ใช่สีเทา) */
  remove(animate = true) {
    this.removed = true;
    this.setEnabled(false);
    this.pulse.stop();
    const targets = [this.ring, this.letter];
    if (!animate) {
      targets.forEach((t) => t.setVisible(false));
      return;
    }
    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration: 300,
      onComplete: () => targets.forEach((t) => t.setVisible(false))
    });
  }

  destroy() {
    this.pulse.stop();
    this.ring.destroy();
    this.letter.destroy();
    this.zone.destroy();
  }
}
