import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT_BODY } from '../config.js';
import { animKey } from '../systems/Assets.js';
import { playSfx } from '../systems/AudioManager.js';
import { addCoverImage } from '../ui/ImageFit.js';
import { wrapThai } from '../ui/ThaiText.js';
import { FLOW, goTo, setScreenReaderText } from '../systems/GameFlow.js';

// AccidentScene — เล่นเฟรม anim ทีละภาพ (Ken Burns) + คำบรรยาย
// เฟรมสุดท้าย: แฟลชขาว + เขย่าจอ + เสียงชน
const FRAME_MS = 1800;
const ZOOM = 1.12;
const CROSSFADE_MS = 250;

export default class AccidentScene extends Phaser.Scene {
  constructor() {
    super('AccidentScene');
  }

  init(data) {
    this.index = data && Number.isInteger(data.index) ? data.index : 0;
    this._leaving = false;
  }

  create() {
    this.sc = this.registry.get('scenarios')[this.index];
    this.frames = this.sc.anim_frames || [];
    this.captions = this.sc.anim_caption || [];
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(250, 0, 0, 0);

    // แถบคำบรรยายด้านล่าง (อยู่บนสุดเสมอ)
    this.captionBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 70, GAME_WIDTH, 140, 0x000000, 0.6).setDepth(50).setVisible(false);
    this.captionStyle = {
      fontFamily: FONT_BODY,
      fontSize: '38px',
      fontStyle: '600',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 6,
      stroke: '#000000',
      strokeThickness: 4,
      padding: { top: 8, bottom: 4 }
    };
    this.caption = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70, '', this.captionStyle).setOrigin(0.5).setDepth(51);

    // แฟลชขาว
    this.flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 1).setDepth(60).setAlpha(0);

    if (this.frames.length === 0) {
      // ไม่มีเฟรม: ข้ามไป Lesson
      goTo(this, FLOW.afterAccident, { index: this.index });
      return;
    }
    this.current = null;
    this.showFrame(0);
  }

  showFrame(i) {
    const isLast = i === this.frames.length - 1;
    const img = addCoverImage(this, animKey(this.sc.id, i)).setAlpha(0);
    const base = img.scale;

    // Ken Burns: ซูมช้าๆ และเลื่อนเล็กน้อย สลับทิศทุกเฟรม
    const dir = i % 2 === 0 ? 1 : -1;
    this.tweens.add({
      targets: img,
      scale: base * ZOOM,
      x: img.x + dir * 25,
      y: img.y - 12,
      duration: FRAME_MS + CROSSFADE_MS,
      ease: 'Linear'
    });
    this.tweens.add({ targets: img, alpha: 1, duration: CROSSFADE_MS });
    if (this.current) {
      const prev = this.current;
      this.time.delayedCall(CROSSFADE_MS, () => prev.destroy());
    }
    this.current = img;

    const cap = this.captions[i] || '';
    this.caption.setText(cap ? wrapThai(cap, this.captionStyle, GAME_WIDTH - 120) : '');
    this.captionBg.setVisible(Boolean(cap));
    setScreenReaderText(cap);

    if (isLast) {
      this.time.delayedCall(CROSSFADE_MS, () => this.impact());
    }

    this.time.delayedCall(FRAME_MS, () => {
      if (isLast) {
        goTo(this, FLOW.afterAccident, { index: this.index }, 400);
      } else {
        this.showFrame(i + 1);
      }
    });
  }

  impact() {
    playSfx('crash');
    this.flash.setAlpha(1);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 450, ease: 'Quad.easeOut' });
    this.cameras.main.shake(400, 0.015);
  }
}
