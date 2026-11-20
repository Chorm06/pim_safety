import Phaser from 'phaser';
import { imageToScreen, screenToImage } from './ImageFit.js';

const HANDLE = 28;
const round3 = (v) => Math.round(v * 1000) / 1000;
const clamp01 = (v) => Phaser.Math.Clamp(v, 0, 1);

// โหมด Debug: ลากวงเพื่อย้าย, ลากมุมขวาล่างเพื่อปรับขนาด
// hotspots = { A: {x,y,w,h}, ... } (สัดส่วน 0–1 ของภาพ) — แก้ไขค่าในอ็อบเจกต์นี้โดยตรง
export default class HotspotEditor {
  constructor(scene, img, hotspots, onChange) {
    this.scene = scene;
    this.img = img;
    this.hotspots = hotspots;
    this.onChange = onChange;
    this.items = [];

    for (const key of Object.keys(hotspots)) {
      this.items.push(this.createItem(key));
    }
    this.redraw();
  }

  createItem(key) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(1500);
    const label = s.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffff00',
        backgroundColor: 'rgba(0,0,0,0.75)',
        padding: { left: 6, right: 6, top: 3, bottom: 3 }
      })
      .setDepth(1502);

    // ตัววง: ลากเพื่อย้าย
    const body = s.add.zone(0, 0, 10, 10).setDepth(1501).setInteractive({ draggable: true, cursor: 'move' });
    body.on('drag', (pointer) => {
      const p = screenToImage(this.img, pointer.x, pointer.y);
      const h = this.hotspots[key];
      h.x = round3(clamp01(p.x - item.grab.x));
      h.y = round3(clamp01(p.y - item.grab.y));
      this.redraw();
    });
    body.on('dragstart', (pointer) => {
      const p = screenToImage(this.img, pointer.x, pointer.y);
      const h = this.hotspots[key];
      item.grab = { x: p.x - h.x, y: p.y - h.y };
    });
    body.on('dragend', () => this.onChange && this.onChange());

    // มุมขวาล่าง: ลากเพื่อปรับขนาด (ขยายรอบจุดกึ่งกลาง)
    const handle = s.add
      .rectangle(0, 0, HANDLE, HANDLE, 0xffff00, 1)
      .setStrokeStyle(2, 0x000000)
      .setDepth(1503)
      .setInteractive({ draggable: true, cursor: 'nwse-resize' });
    handle.on('drag', (pointer) => {
      const p = screenToImage(this.img, pointer.x, pointer.y);
      const h = this.hotspots[key];
      h.w = round3(Phaser.Math.Clamp(Math.abs(p.x - h.x) * 2, 0.02, 1));
      h.h = round3(Phaser.Math.Clamp(Math.abs(p.y - h.y) * 2, 0.02, 1));
      this.redraw();
    });
    handle.on('dragend', () => this.onChange && this.onChange());

    const item = { key, g, label, body, handle, grab: { x: 0, y: 0 } };
    return item;
  }

  redraw() {
    for (const it of this.items) {
      const h = this.hotspots[it.key];
      const c = imageToScreen(this.img, h.x, h.y);
      const w = h.w * this.img.displayWidth;
      const hh = h.h * this.img.displayHeight;
      it.g.clear();
      it.g.fillStyle(0x00ffff, 0.12).fillRect(c.x - w / 2, c.y - hh / 2, w, hh);
      it.g.lineStyle(2, 0x00ffff, 1).strokeRect(c.x - w / 2, c.y - hh / 2, w, hh);
      it.g.lineStyle(4, 0xff0000, 1).strokeEllipse(c.x, c.y, w, hh);
      it.g.fillStyle(0x00ffff, 1).fillCircle(c.x, c.y, 5);
      it.body.setPosition(c.x, c.y).setSize(Math.max(w, 30), Math.max(hh, 30));
      it.body.input.hitArea.setTo(0, 0, Math.max(w, 30), Math.max(hh, 30));
      it.handle.setPosition(c.x + w / 2, c.y + hh / 2);
      it.label
        .setText(`${it.key}  x:${h.x} y:${h.y}\n   w:${h.w} h:${h.h}`)
        .setPosition(c.x - w / 2, c.y - hh / 2 - 46);
    }
  }

  destroy() {
    for (const it of this.items) {
      it.g.destroy();
      it.label.destroy();
      it.body.destroy();
      it.handle.destroy();
    }
    this.items = [];
  }
}
