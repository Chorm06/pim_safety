import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config.js';
import { debugButton, debugToast } from '../ui/DebugUI.js';

// แผงข้ามฉาก (เปิดเฉพาะ ?debug=1) วางทับทุก Scene ที่มุมซ้ายล่าง
// ฉากที่ยังไม่ได้สร้างจะเป็นปุ่มสีเทา
const SAVE_KEY = 'pim_safety_save_v1';

export default class DebugScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DebugScene', active: false });
  }

  create() {
    this.open = false;
    this.toggle = debugButton(this, 12, GAME_HEIGHT - 12, 'DEBUG ▸', () => this.setOpen(!this.open), { origin: { x: 0, y: 1 } });
    this.toggle.setOrigin(0, 1);
    this.panel = [];
    this.buildPanel();
    this.setOpen(false);
  }

  buildPanel() {
    const scenarios = this.registry.get('scenarios') || [];
    const sceneKeys = this.game.scene.keys;
    const has = (k) => Boolean(sceneKeys[k]);
    const items = [
      { label: 'Intro', key: 'IntroScene' },
      { label: 'Title', key: 'TitleScene', perScenario: true },
      { label: 'Drive', key: 'DriveScene', perScenario: true },
      { label: 'Hazard', key: 'HazardScene', perScenario: true },
      { label: 'Accident', key: 'AccidentScene', perScenario: true },
      { label: 'Lesson', key: 'LessonScene', perScenario: true },
      { label: 'Result', key: 'ResultScene' }
    ];

    let x = 130;
    const y = GAME_HEIGHT - 12;
    for (const it of items) {
      const targets = it.perScenario ? scenarios.map((s, i) => ({ text: `${it.label} ${s.id}`, data: { index: i } })) : [{ text: it.label, data: {} }];
      for (const t of targets) {
        const b = debugButton(this, x, y, t.text, () => this.jump(it.key, t.data), { origin: { x: 0, y: 1 } });
        b.setOrigin(0, 1);
        if (!has(it.key)) b.setDisabled(true);
        this.panel.push(b);
        x += b.width + 6;
      }
    }
    const clear = debugButton(this, x, y, 'ล้าง save', () => this.clearSave());
    clear.setOrigin(0, 1).setBackgroundColor('#b91c1c');
    this.panel.push(clear);
  }

  setOpen(on) {
    this.open = on;
    this.toggle.setText(on ? 'DEBUG ◂' : 'DEBUG ▸');
    this.panel.forEach((b) => b.setVisible(on));
  }

  jump(key, data) {
    // หยุดทุกฉากของเกม แล้วเริ่มฉากที่เลือก
    this.game.scene.getScenes(true).forEach((s) => {
      if (s.scene.key !== 'DebugScene') s.scene.stop();
    });
    this.scene.launch(key, data);
    this.scene.bringToTop();
  }

  clearSave() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      /* localStorage ใช้ไม่ได้ */
    }
    this.registry.set('results', []);
    this.registry.set('hotspotOverrides', {});
    debugToast(this, 'ล้าง save และค่า hotspot ที่แก้ไว้แล้ว');
  }
}
