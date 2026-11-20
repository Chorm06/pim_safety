import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT_HEADING, FONT_BODY } from '../config.js';
import { listAllImages } from '../systems/Assets.js';

// BootScene: โหลด scenario.json ก่อน แล้วจึงโหลดภาพทั้งหมดตามรายการใน json พร้อมแถบโหลด
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.cameras.main.setBackgroundColor('#0b1f3a');
    this.load.json('scenarioData', 'data/scenario.json');
  }

  create() {
    const data = this.cache.json.get('scenarioData');
    if (!data || !Array.isArray(data.scenarios) || data.scenarios.length === 0) {
      this.showFatal('โหลดข้อมูลเกม (scenario.json) ไม่สำเร็จ');
      return;
    }

    // เก็บข้อมูลไว้ใน registry ให้ทุก Scene ใช้
    this.registry.set('scenarios', data.scenarios);
    this.registry.set('missingTextures', []);

    this.buildLoadingBar();

    const images = listAllImages(data.scenarios);
    images.forEach(({ key, path }) => this.load.image(key, path));

    // ถ้าภาพไหนหาย: ไม่ error ให้สร้างภาพ placeholder แทนหลังโหลดเสร็จ
    this.load.on('loaderror', (file) => {
      if (file.type === 'image') {
        this.registry.get('missingTextures').push(file.key);
        console.warn(`[Boot] ไม่พบภาพ: ${file.url}`);
      }
    });
    this.load.on('progress', (v) => this.updateBar(v));
    this.load.once('complete', () => {
      this.createPlaceholders();
      this.scene.start('IntroScene');
    });
    this.load.start();
  }

  buildLoadingBar() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add
      .text(cx, cy - 80, 'PIM Safety Challenge', {
        fontFamily: FONT_HEADING,
        fontSize: '52px',
        fontStyle: '700',
        color: '#ffffff',
        padding: { top: 10, bottom: 4 }
      })
      .setOrigin(0.5);

    this.barW = 600;
    this.barH = 28;
    this.barX = cx - this.barW / 2;
    this.barY = cy;
    this.add.rectangle(cx, cy + this.barH / 2, this.barW + 8, this.barH + 8, 0xffffff, 0.15).setStrokeStyle(2, 0xffffff, 0.6);
    this.bar = this.add.graphics();
    this.pct = this.add
      .text(cx, cy + 70, 'กำลังโหลด 0%', {
        fontFamily: FONT_BODY,
        fontSize: '26px',
        color: '#ffffff',
        padding: { top: 6, bottom: 2 }
      })
      .setOrigin(0.5);
  }

  updateBar(v) {
    this.bar.clear();
    this.bar.fillStyle(0x2ecc71, 1).fillRect(this.barX, this.barY, this.barW * v, this.barH);
    this.pct.setText(`กำลังโหลด ${Math.round(v * 100)}%`);
  }

  // ภาพแทนสำหรับไฟล์ที่หาย (ข้อความสำหรับนักพัฒนา ไม่ใช่เนื้อหาเกม)
  createPlaceholders() {
    for (const key of this.registry.get('missingTextures')) {
      if (this.textures.exists(key)) this.textures.remove(key);
      const rt = this.make.renderTexture({ width: 1280, height: 720 }, false);
      const g = this.make.graphics({}, false);
      g.fillStyle(0x333333, 1).fillRect(0, 0, 1280, 720);
      g.lineStyle(6, 0xff5555, 1).strokeRect(3, 3, 1274, 714);
      const t = this.make.text(
        { x: 640, y: 360, text: `[ไม่พบภาพ]\n${key}`, style: { fontFamily: FONT_BODY, fontSize: '40px', color: '#ff8888', align: 'center' } },
        false
      ).setOrigin(0.5);
      rt.draw(g).draw(t);
      rt.saveTexture(key);
      g.destroy();
      t.destroy();
    }
  }

  showFatal(msg) {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `${msg}\nกรุณารีเฟรชหน้าเว็บ`, {
        fontFamily: FONT_BODY,
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
        padding: { top: 8, bottom: 4 }
      })
      .setOrigin(0.5);
  }
}
