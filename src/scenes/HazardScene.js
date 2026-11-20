import Phaser from 'phaser';
import { CONFIG, GAME_WIDTH } from '../config.js';
import { imageKey } from '../systems/Assets.js';
import HazardRound from '../systems/HazardRound.js';
import { playSfx } from '../systems/AudioManager.js';
import { addCoverImage, screenToImage } from '../ui/ImageFit.js';
import HotspotView from '../ui/HotspotView.js';
import HotspotEditor from '../ui/HotspotEditor.js';
import Popup from '../ui/Popup.js';
import { CountdownTimer, TimerView } from '../ui/Timer.js';
import { debugButton, debugLabel, copyText, debugToast } from '../ui/DebugUI.js';
import { UI_TEXT } from '../ui/strings.js';
import { FLOW, goTo } from '../systems/GameFlow.js';

// ระยะเวลาแสดงภาพคำถามก่อนเปลี่ยนเป็นภาพตัวเลือก (ตาม Prompt)
const QUESTION_MS = 2500;
const CORRECT_DELAY_MS = 900;


/**
 * HazardScene — ช่วงเลือกจุดเสี่ยง
 * state: 'question' → 'choosing' ⇄ 'popup' → 'done'  (+ 'editing' ในโหมด Debug)
 */
export default class HazardScene extends Phaser.Scene {
  constructor() {
    super('HazardScene');
  }

  init(data) {
    this.index = data && Number.isInteger(data.index) ? data.index : 0;
    this._leaving = false;
  }

  create() {
    const scenarios = this.registry.get('scenarios');
    this.sc = scenarios[this.index];
    this.state = 'question';
    this.timer = null;
    this.views = [];
    this.editor = null;

    // ค่า hotspot ที่แก้ในโหมด Debug (เก็บไว้ระหว่างเปิดหน้าเว็บ) ทับค่าจาก json
    const overrides = (this.registry.get('hotspotOverrides') || {})[this.sc.id] || {};
    this.choices = this.sc.choices.map((c) => ({ ...c, hotspot: { ...(overrides[c.key] || c.hotspot) } }));
    this.round = new HazardRound(this.choices);

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.questionImg = addCoverImage(this, imageKey(this.sc.id, 'question'));
    this.questionTimer = this.time.delayedCall(QUESTION_MS, () => this.showChoices());

    if (CONFIG.DEBUG) this.buildDebugTools();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  // ---------- ช่วงเลือก ----------

  showChoices() {
    if (this.state !== 'question') return;
    this.questionTimer && this.questionTimer.remove(false);

    this.choicesImg = addCoverImage(this, imageKey(this.sc.id, 'choices')).setAlpha(0);
    this.tweens.add({
      targets: this.choicesImg,
      alpha: 1,
      duration: 350,
      onComplete: () => this.questionImg && this.questionImg.destroy()
    });

    this.views = this.choices.map((c) => new HotspotView(this, this.choicesImg, c, (key) => this.onSelect(key)));

    this.timer = new CountdownTimer(CONFIG.DECISION_TIME_SEC, {
      onTick: (s) => playSfx(s <= 1 ? 'tickLast' : 'tick'),
      onExpire: () => this.onTimeout()
    });
    this.timerView = new TimerView(this, GAME_WIDTH / 2, 90).setDepth(20);
    this.timerView.render(this.timer);
    this.timer.start();
    playSfx('tick');

    this.choiceStartedAt = this.time.now;
    this.state = 'choosing';
    if (this.dbg) this.dbg.skip.setDisabled(true);
  }

  update(_time, delta) {
    if (this.timer) {
      this.timer.update(delta);
      if (this.timerView && this.timerView.visible) this.timerView.render(this.timer);
    }
  }

  onSelect(key) {
    if (this.state !== 'choosing') return;
    const res = this.round.select(key);
    if (!res) return;
    const view = this.views.find((v) => v.key === key);

    if (res.correct) {
      this.state = 'done';
      this.timer.stop();
      playSfx('correct');
      view.flashCorrect();
      this.views.forEach((v) => v.setEnabled(false));
      this.time.delayedCall(CORRECT_DELAY_MS, () => this.finish());
      return;
    }

    // ตอบผิด: หยุดเวลา → ป๊อปอัป → ลองใหม่ → วงนั้นหายไป
    this.timer.pause();
    this.state = 'popup';
    playSfx('wrong');
    this.cameras.main.shake(180, 0.006);
    new Popup(this, {
      message: res.choice.popup,
      variant: 'wrong',
      buttonLabel: UI_TEXT.retryButton,
      onClose: () => {
        view.remove();
        this.state = 'choosing';
        this.timer.resume(); // เดินเวลาที่เหลือต่อ (ถ้ายังไม่หมด)
      }
    });
  }

  onTimeout() {
    if (this.state !== 'choosing') return;
    this.state = 'popup';
    // หมดเวลาแล้วไม่จับเวลาซ้ำ: ซ่อนวงเวลา
    this.tweens.add({ targets: this.timerView, alpha: 0, duration: 300, onComplete: () => this.timerView.setVisible(false) });
    new Popup(this, {
      message: UI_TEXT.timeout,
      variant: 'info',
      buttonLabel: UI_TEXT.timeoutButton,
      onClose: () => {
        this.state = 'choosing';
      }
    });
  }

  finish() {
    const timeSec = Math.round(((this.time.now - this.choiceStartedAt) / 1000) * 10) / 10;
    const result = { id: this.sc.id, attempts: this.round.attempts, timeSec };

    // เก็บผลรายข้อไว้ใน registry (Step 5 จะบันทึกลง localStorage)
    const results = (this.registry.get('results') || []).filter((r) => r.id !== result.id);
    results.push(result);
    this.registry.set('results', results);

    goTo(this, FLOW.afterHazard, { index: this.index });
  }

  // ---------- โหมด Debug ----------

  buildDebugTools() {
    const coords = debugLabel(this, 12, 12, 'x: -  y: -');
    this.input.on('pointermove', (p) => {
      const img = this.choicesImg || this.questionImg;
      if (!img) return;
      const f = screenToImage(img, p.x, p.y);
      coords.setText(`x: ${f.x.toFixed(3)}  y: ${f.y.toFixed(3)}  (${this.choicesImg ? 'choices' : 'question'}.jpg)`);
    });

    const skip = debugButton(this, 12, 52, 'ข้ามภาพคำถาม', () => this.showChoices());
    const edit = debugButton(this, 12, 96, 'แก้ hotspot: ปิด', () => this.toggleEdit());
    const copy = debugButton(this, 12, 140, 'Copy JSON', () => this.copyJson());
    const reset = debugButton(this, 12, 184, 'คืนค่าเดิมจาก json', () => this.resetHotspots());
    this.dbg = { coords, skip, edit, copy, reset };
  }

  toggleEdit() {
    if (this.state === 'question') this.showChoices();
    if (this.state === 'done') return;

    if (!this.editor) {
      this.prevState = this.state === 'editing' ? 'choosing' : this.state;
      this.state = 'editing';
      this.timer && this.timer.pause();
      this.views.forEach((v) => v.setEnabled(false));
      const hs = {};
      this.choices.forEach((c) => (hs[c.key] = c.hotspot));
      this.editor = new HotspotEditor(this, this.choicesImg, hs, () => this.applyHotspots());
      this.dbg.edit.setText('แก้ hotspot: เปิด').setActiveState(true);
    } else {
      this.editor.destroy();
      this.editor = null;
      this.applyHotspots();
      this.state = this.prevState === 'popup' ? 'popup' : 'choosing';
      this.views.forEach((v) => !v.removed && v.setEnabled(true));
      if (this.state === 'choosing') this.timer && this.timer.resume();
      this.dbg.edit.setText('แก้ hotspot: ปิด').setActiveState(false);
    }
  }

  applyHotspots() {
    this.views.forEach((v) => {
      const c = this.choices.find((x) => x.key === v.key);
      v.setHotspot(c.hotspot);
      if (this.editor) v.setEnabled(false);
    });
    const all = this.registry.get('hotspotOverrides') || {};
    const mine = {};
    this.choices.forEach((c) => (mine[c.key] = { ...c.hotspot }));
    all[this.sc.id] = mine;
    this.registry.set('hotspotOverrides', all);
  }

  resetHotspots() {
    this.sc.choices.forEach((orig) => {
      const c = this.choices.find((x) => x.key === orig.key);
      Object.assign(c.hotspot, orig.hotspot);
    });
    if (this.editor) this.editor.redraw();
    this.applyHotspots();
    const all = this.registry.get('hotspotOverrides') || {};
    delete all[this.sc.id];
    this.registry.set('hotspotOverrides', all);
    debugToast(this, 'คืนค่า hotspot จาก scenario.json แล้ว');
  }

  async copyJson() {
    // รูปแบบเดียวกับ scenario.json: นำไปวางแทน "choices": [...] ของข้อนี้ได้ทันที
    const lines = this.choices.map((c) => {
      const h = c.hotspot;
      return (
        `    {"key": ${JSON.stringify(c.key)}, "correct": ${c.correct}, ` +
        `"hotspot": {"x": ${h.x}, "y": ${h.y}, "w": ${h.w}, "h": ${h.h}},\n` +
        `     "popup": ${JSON.stringify(c.popup)}}`
      );
    });
    const text = `"choices": [\n${lines.join(',\n')}\n]`;
    console.info(`[Debug] hotspot ข้อ ${this.sc.id}:\n${text}`);
    const ok = await copyText(text);
    debugToast(this, ok ? `คัดลอก choices ของข้อ ${this.sc.id} แล้ว — วางแทนใน scenario.json` : 'คัดลอกไม่ได้ ดูข้อความใน Console (F12)');
  }

  cleanup() {
    this.input.off('pointermove');
    this.editor && this.editor.destroy();
    this.views.forEach((v) => v.destroy());
    this.views = [];
    this.timer = null;
  }
}
