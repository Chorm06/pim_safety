import Phaser from 'phaser';
import { FONT_HEADING, MIN_TOUCH_SIZE } from '../config.js';

// ปุ่มทั่วไปของเกม: สี่เหลี่ยมมุมมน + ข้อความ ขนาดขั้นต่ำ 88×88 ที่ขนาดฐาน
export default class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, onClick, opts = {}) {
    super(scene, x, y);
    const {
      width = 320,
      height = 96,
      fontSize = 34,
      fill = 0x1f7a3a,
      fillHover = 0x29a04c,
      stroke = 0xffffff,
      textColor = '#ffffff',
      radius = 22
    } = opts;

    this.w = Math.max(width, MIN_TOUCH_SIZE);
    this.h = Math.max(height, MIN_TOUCH_SIZE);
    this.fillColor = fill;
    this.fillHover = fillHover;
    this.strokeColor = stroke;
    this.radius = radius;
    this.onClick = onClick;
    this.enabled = true;

    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, label, {
        fontFamily: FONT_HEADING,
        fontSize: `${fontSize}px`,
        fontStyle: '600',
        color: textColor,
        align: 'center',
        padding: { top: 8, bottom: 4 } // กันสระ/วรรณยุกต์ไทยถูกตัด
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.draw(this.fillColor);

    this.setSize(this.w, this.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.enabled && this.draw(this.fillHover));
    this.on('pointerout', () => {
      this.draw(this.fillColor);
      this.setScale(1);
    });
    this.on('pointerdown', () => this.enabled && this.setScale(0.96));
    this.on('pointerup', () => {
      if (!this.enabled) return;
      this.setScale(1);
      this.onClick && this.onClick();
    });

    scene.add.existing(this);
  }

  draw(color) {
    const { w, h, radius } = this;
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, radius);
    this.bg.fillStyle(color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    this.bg.lineStyle(4, this.strokeColor, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  }

  setEnabled(on) {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.5);
    return this;
  }
}
