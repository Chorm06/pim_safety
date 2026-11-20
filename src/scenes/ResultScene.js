import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT_HEADING, FONT_BODY } from '../config.js';
import Button from '../ui/Button.js';
import { UI_TEXT } from '../ui/strings.js';
import { summarize } from '../systems/ResultSummary.js';
import { playSfx } from '../systems/AudioManager.js';
import { goTo, setScreenReaderText } from '../systems/GameFlow.js';

// ResultScene — Mission Completed + พลุ + สรุปผล + ตารางรายข้อ
export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  init() {
    this._leaving = false;
  }

  create() {
    const scenarios = this.registry.get('scenarios') || [];
    const results = this.registry.get('results') || [];
    const sum = summarize(scenarios, results);

    this.cameras.main.setBackgroundColor('#0b1f3a');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.drawBackground();
    this.startFireworks();
    playSfx('correct');

    const cx = GAME_WIDTH / 2;

    const title = this.add
      .text(cx, 78, UI_TEXT.missionCompleted, {
        fontFamily: FONT_HEADING,
        fontSize: '72px',
        fontStyle: '700',
        color: '#ffe066',
        stroke: '#7a4a00',
        strokeThickness: 8,
        padding: { top: 12, bottom: 6 }
      })
      .setOrigin(0.5)
      .setDepth(10);
    title.setScale(0.6);
    this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Back.easeOut' });

    // การ์ดสรุป 3 ช่อง
    const fmt = (v) => (v === null || Number.isNaN(v) ? '-' : v);
    const cards = [
      { label: UI_TEXT.firstTryPercent, value: `${sum.firstTryPercent}%` },
      { label: UI_TEXT.totalWrong, value: `${sum.totalWrong} ${UI_TEXT.timesUnit}` },
      { label: UI_TEXT.totalTime, value: `${fmt(sum.totalTimeSec)} ${UI_TEXT.secondsUnit}` }
    ];
    const cardW = 330;
    const gap = 26;
    const startX = cx - (cardW * 3 + gap * 2) / 2 + cardW / 2;
    cards.forEach((c, i) => this.drawCard(startX + i * (cardW + gap), 215, cardW, 130, c.label, c.value));

    this.drawTable(sum.rows, 318);

    new Button(this, cx, GAME_HEIGHT - 70, UI_TEXT.playAgain, () => this.playAgain(), { width: 300, height: 96 }).setDepth(10);

    setScreenReaderText(
      `${UI_TEXT.missionCompleted}. ${UI_TEXT.firstTryPercent} ${sum.firstTryPercent}%. ${UI_TEXT.totalWrong} ${sum.totalWrong}. ${UI_TEXT.totalTime} ${sum.totalTimeSec} ${UI_TEXT.secondsUnit}`
    );
  }

  drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0b1f3a, 0x0b1f3a, 0x1b3a6b, 0x1b3a6b, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  drawCard(x, y, w, h, label, value) {
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0xffffff, 0.95).fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);
    g.lineStyle(4, 0x2ecc71, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 20);
    this.add
      .text(x, y - 30, label, { fontFamily: FONT_BODY, fontSize: '24px', color: '#334155', padding: { top: 8, bottom: 2 } })
      .setOrigin(0.5)
      .setDepth(6);
    this.add
      .text(x, y + 22, value, { fontFamily: FONT_HEADING, fontSize: '46px', fontStyle: '700', color: '#1f7a3a', padding: { top: 10, bottom: 4 } })
      .setOrigin(0.5)
      .setDepth(6);
  }

  drawTable(rows, top) {
    const cols = [
      { key: 'id', label: UI_TEXT.colNo, w: 90 },
      { key: 'title', label: UI_TEXT.colTitle, w: 560 },
      { key: 'attempts', label: UI_TEXT.colAttempts, w: 220 },
      { key: 'wrong', label: UI_TEXT.colWrong, w: 120 },
      { key: 'timeSec', label: UI_TEXT.colTime, w: 160 }
    ];
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const left = GAME_WIDTH / 2 - tableW / 2;
    const rowH = 58;
    const g = this.add.graphics().setDepth(5);

    const n = rows.length + 1;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(left, top, tableW, rowH * n, 14);
    g.fillStyle(0x1f7a3a, 1).fillRoundedRect(left, top, tableW, rowH, { tl: 14, tr: 14, bl: 0, br: 0 });

    const cell = (text, x, y, w, header, align = 'center') => {
      const style = {
        fontFamily: header ? FONT_HEADING : FONT_BODY,
        fontSize: header ? '24px' : '26px',
        fontStyle: header ? '600' : 'normal',
        color: '#ffffff',
        padding: { top: 8, bottom: 2 }
      };
      const t = this.add.text(align === 'left' ? x + 16 : x + w / 2, y + rowH / 2, String(text), style);
      t.setOrigin(align === 'left' ? 0 : 0.5, 0.5).setDepth(6);
      // ชื่อหัวข้อยาวเกินช่อง: ย่อขนาดตัวอักษรลงให้พอดี
      if (t.width > w - 24) t.setScale((w - 24) / t.width);
    };

    let x = left;
    cols.forEach((c) => {
      cell(c.label, x, top, c.w, true);
      x += c.w;
    });

    rows.forEach((r, i) => {
      const y = top + rowH * (i + 1);
      if (i > 0) g.lineStyle(1, 0xffffff, 0.2).lineBetween(left, y, left + tableW, y);
      let cx = left;
      cols.forEach((c) => {
        let v = r[c.key];
        if (v === null) v = '-';
        else if (c.key === 'timeSec') v = `${v} ${UI_TEXT.secondsUnit}`;
        cell(v, cx, y, c.w, false, c.key === 'title' ? 'left' : 'center');
        cx += c.w;
      });
    });
  }

  startFireworks() {
    if (!this.textures.exists('spark')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xffffff, 1).fillCircle(6, 6, 6);
      g.generateTexture('spark', 12, 12);
      g.destroy();
    }
    const colors = [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xe040fb, 0xffffff];
    const burst = () => {
      const x = Phaser.Math.Between(150, GAME_WIDTH - 150);
      const y = Phaser.Math.Between(90, 320);
      const tint = Phaser.Utils.Array.GetRandom(colors);
      const em = this.add.particles(x, y, 'spark', {
        speed: { min: 120, max: 360 },
        angle: { min: 0, max: 360 },
        lifespan: 1100,
        gravityY: 260,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        tint,
        blendMode: 'ADD',
        emitting: false
      });
      em.setDepth(2);
      em.explode(46);
      this.time.delayedCall(1500, () => em.destroy());
    };
    burst();
    this.fireworks = this.time.addEvent({ delay: 650, loop: true, callback: burst });
    // ยิงพลุ 6 วินาทีแรก แล้วหยุด
    this.time.delayedCall(6000, () => this.fireworks.remove(false));
  }

  playAgain() {
    // TODO Step 5: ล้าง save ใน localStorage ด้วย
    this.registry.set('results', []);
    goTo(this, 'IntroScene');
  }
}
