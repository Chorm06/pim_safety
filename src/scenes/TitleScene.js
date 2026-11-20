import Phaser from 'phaser';
import { imageKey } from '../systems/Assets.js';
import { addCoverImage } from '../ui/ImageFit.js';
import { FLOW, goTo, setScreenReaderText } from '../systems/GameFlow.js';

// TitleScene — แสดง title.jpg 2.5 วินาที (ชื่อหัวข้ออยู่ในภาพแล้ว)
const TITLE_MS = 2500;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  init(data) {
    this.index = data && Number.isInteger(data.index) ? data.index : 0;
    this._leaving = false;
  }

  create() {
    const sc = this.registry.get('scenarios')[this.index];
    const img = addCoverImage(this, imageKey(sc.id, 'title'));
    setScreenReaderText(sc.title);

    // ซูมเข้าเบาๆ ให้ภาพไม่นิ่ง
    this.tweens.add({ targets: img, scale: img.scale * 1.04, duration: TITLE_MS + 300, ease: 'Sine.easeOut' });
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.time.delayedCall(TITLE_MS, () => goTo(this, FLOW.afterTitle, { index: this.index }));
  }
}
