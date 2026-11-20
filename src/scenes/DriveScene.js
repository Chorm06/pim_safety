import Phaser from 'phaser';
import { CONFIG, GAME_WIDTH, GAME_HEIGHT, FONT_HEADING, FONT_BODY, MIN_TOUCH_SIZE } from '../config.js';
import { imageKey } from '../systems/Assets.js';
import DriveSim, { DRIVE } from '../systems/DriveSim.js';
import InputManager, { isTouchDevice, loadControlMode, saveControlMode, requestTiltPermission } from '../systems/InputManager.js';
import { playSfx } from '../systems/AudioManager.js';
import { FLOW, goTo, setScreenReaderText } from '../systems/GameFlow.js';
import Button from '../ui/Button.js';
import { UI_TEXT } from '../ui/strings.js';
import { wrapThai } from '../ui/ThaiText.js';
import { debugButton, debugLabel, debugToast } from '../ui/DebugUI.js';

// ---------- ค่าการฉายภาพ pseudo-3D ----------
const HORIZON_Y = 320; // เส้นขอบฟ้า (ตรงกับประมาณ 45% ของภาพ story.jpg)
const FOCAL = 430; // px ต่อ 1 หน่วยโลก ที่ระยะ z = 1
const CAM_H = (GAME_HEIGHT - HORIZON_Y) / FOCAL; // ให้ z = 1 อยู่ขอบล่างจอพอดี
const Z_NEAR = 0.8;
const Z_FAR = 60;
const ROAD_HALF = 1.6; // ครึ่งความกว้างถนน (3 เลน + ไหล่ทาง)
const CURB_W = 0.16;
const DASH_PERIOD = 3;
const DASH_LEN = 1.4;

function project(x, z) {
  const s = FOCAL / z;
  return { x: GAME_WIDTH / 2 + x * s, y: HORIZON_Y + CAM_H * s, s };
}

export default class DriveScene extends Phaser.Scene {
  constructor() {
    super('DriveScene');
  }

  init(data) {
    this.index = data && Number.isInteger(data.index) ? data.index : 0;
    this._leaving = false;
  }

  create() {
    this.sc = this.registry.get('scenarios')[this.index];
    this.touch = isTouchDevice();
    this.sim = new DriveSim({ lanes: CONFIG.LANES, durationSec: CONFIG.DRIVE_DURATION_SEC });
    this.input_ = new InputManager(this, { lanes: CONFIG.LANES, startLane: this.sim.lane });

    this.cameras.main.setBackgroundColor('#8a8f94');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.buildBackground();
    this.roadG = this.add.graphics().setDepth(1);
    this.carsFarG = this.add.graphics().setDepth(2);
    this.buildPlayer();
    this.carsNearG = this.add.graphics().setDepth(4);

    this.buildHud();
    if (this.touch) this.buildTouchControls();
    else this.showKeyboardHint();
    this.buildCaption();
    if (CONFIG.DEBUG) this.buildDebug();

    setScreenReaderText(this.sc.story_text || this.sc.title);
  }

  // ---------- ฉาก ----------

  buildBackground() {
    // story.jpg ส่วนบน (ท้องฟ้า/ตึก) กว้างเต็มจอ ชิดบน แล้วตัดที่เส้นขอบฟ้า
    const img = this.add.image(GAME_WIDTH / 2, 0, imageKey(this.sc.id, 'story')).setOrigin(0.5, 0).setDepth(0);
    const scale = GAME_WIDTH / img.frame.realWidth;
    img.setScale(scale);
    // ให้เส้นขอบฟ้าของภาพ (~45%) ตรงกับ HORIZON_Y
    img.y = HORIZON_Y - img.displayHeight * 0.45;
    if (img.y > 0) img.y = 0;
    const mask = this.make.graphics({ add: false });
    mask.fillRect(0, 0, GAME_WIDTH, HORIZON_Y + 2);
    img.setMask(mask.createGeometryMask());

    // หมอกจางที่เส้นขอบฟ้า ให้ภาพกับถนนต่อกันเนียน
    const haze = this.add.graphics().setDepth(0.5);
    haze.fillGradientStyle(0xd9dde0, 0xd9dde0, 0xd9dde0, 0xd9dde0, 0, 0, 0.9, 0.9);
    haze.fillRect(0, HORIZON_Y - 60, GAME_WIDTH, 60);
    // ทางเท้า/พื้นข้างถนน
    haze.fillStyle(0xb8b2a7, 1).fillRect(0, HORIZON_Y, GAME_WIDTH, GAME_HEIGHT - HORIZON_Y);
  }

  buildPlayer() {
    // รถจักรยานยนต์สีเหลืองมองจากด้านหลัง (วาดด้วย Graphics ไปก่อน)
    const c = this.add.container(0, 0).setDepth(3);
    const g = this.add.graphics();
    // เงา
    g.fillStyle(0x000000, 0.3).fillEllipse(0, 4, 150, 28);
    // ล้อหลัง
    g.fillStyle(0x111111, 1).fillRoundedRect(-22, -70, 44, 74, 14);
    // บังโคลน + ไฟท้าย
    g.fillStyle(0xf4c20d, 1).fillRoundedRect(-34, -92, 68, 30, 10);
    g.fillStyle(0xff3030, 1).fillRoundedRect(-16, -84, 32, 10, 4);
    // ตัวรถ
    g.fillStyle(0xf4c20d, 1).fillRoundedRect(-46, -140, 92, 54, 18);
    g.lineStyle(3, 0xb88a00, 1).strokeRoundedRect(-46, -140, 92, 54, 18);
    // ท่อไอเสีย
    g.fillStyle(0x777777, 1).fillRoundedRect(36, -104, 22, 12, 5);
    // คนขี่: ลำตัว
    g.fillStyle(0x2b4c7e, 1).fillRoundedRect(-40, -215, 80, 86, 26);
    // แขน + แฮนด์
    g.fillStyle(0x2b4c7e, 1).fillRoundedRect(-74, -196, 30, 56, 12).fillRoundedRect(44, -196, 30, 56, 12);
    g.fillStyle(0x222222, 1).fillRoundedRect(-86, -150, 172, 10, 4);
    g.fillStyle(0x111111, 1).fillCircle(-80, -145, 9).fillCircle(80, -145, 9);
    // หมวกกันน็อก
    g.fillStyle(0xf4c20d, 1).fillCircle(0, -238, 32);
    g.fillStyle(0x222222, 1).fillRect(-32, -236, 64, 10);
    c.add(g);
    this.player = c;
  }

  buildHud() {
    // มาตรวัดความเร็ว มุมซ้ายบน
    this.speedG = this.add.graphics().setDepth(20);
    this.speedText = this.add
      .text(120, 118, '0', { fontFamily: FONT_HEADING, fontSize: '50px', fontStyle: '700', color: '#ffffff', padding: { top: 10, bottom: 4 } })
      .setOrigin(0.5)
      .setDepth(21);
    this.add
      .text(120, 162, UI_TEXT.speedUnit, { fontFamily: FONT_BODY, fontSize: '22px', color: '#dddddd', padding: { top: 4, bottom: 2 } })
      .setOrigin(0.5)
      .setDepth(21);

    // แถบความคืบหน้าจนถึงจุดเสี่ยง (ด้านบนกลาง)
    this.progressG = this.add.graphics().setDepth(20);
  }

  drawHud() {
    const cx = 120;
    const cy = 125;
    const r = 82;
    const p = this.sim.speed / DRIVE.MAX_SPEED;
    const a0 = Phaser.Math.DegToRad(135);
    const a1 = Phaser.Math.DegToRad(405);
    const g = this.speedG;
    g.clear();
    g.fillStyle(0x000000, 0.55).fillCircle(cx, cy, r + 14);
    g.lineStyle(12, 0xffffff, 0.2).beginPath().arc(cx, cy, r, a0, a1).strokePath();
    if (p > 0.001) {
      const color = p > 0.75 ? 0xe74c3c : p > 0.45 ? 0xf1c40f : 0x2ecc71;
      g.lineStyle(12, color, 1).beginPath().arc(cx, cy, r, a0, a0 + (a1 - a0) * p).strokePath();
    }
    this.speedText.setText(String(Math.round(this.sim.speed)));

    const w = 420;
    const x = GAME_WIDTH / 2 - w / 2;
    const pg = this.progressG;
    pg.clear();
    pg.fillStyle(0x000000, 0.5).fillRoundedRect(x - 4, 22, w + 8, 22, 11);
    pg.fillStyle(0xffe066, 1).fillRoundedRect(x, 26, Math.max(14, w * this.sim.progress), 14, 7);
    pg.fillStyle(0xe60000, 1).fillTriangle(x + w + 4, 18, x + w + 4, 48, x + w + 22, 33); // ธงจุดเสี่ยง
  }

  buildCaption() {
    const text = (this.sc.story_text || '').trim();
    if (!text) return; // ข้อ 1 ไม่มีบทเล่าเรื่อง: ไม่แสดงแถบ
    const maxW = this.touch ? 560 : 900; // มือถือ: เว้นที่ให้ปุ่มซ้าย-ขวา
    const style = {
      fontFamily: FONT_BODY,
      fontSize: '30px',
      fontStyle: '600',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 4,
      padding: { top: 8, bottom: 4 }
    };
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 26, wrapThai(text, style, maxW), style).setOrigin(0.5, 1).setDepth(31);
    this.add
      .rectangle(GAME_WIDTH / 2, t.y - t.height / 2, Math.min(t.width, maxW) + 40, t.height + 20, 0x000000, 0.6)
      .setDepth(30);
  }

  showKeyboardHint() {
    const t = this.add
      .text(GAME_WIDTH / 2, 82, UI_TEXT.keyboardHint, {
        fontFamily: FONT_BODY,
        fontSize: '26px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { left: 18, right: 18, top: 8, bottom: 6 }
      })
      .setOrigin(0.5, 0)
      .setDepth(25);
    this.tweens.add({ targets: t, alpha: 0, delay: 5000, duration: 600 });
  }

  // ---------- ปุ่มบนจอ (มือถือ) ----------

  holdButton(x, y, label, { onDown, onUp, color = 0x000000, size = 124, fontSize = 40 }) {
    const c = this.add.container(x, y).setDepth(40);
    const g = this.add.graphics();
    const draw = (pressed) => {
      g.clear();
      g.fillStyle(color, pressed ? 0.75 : 0.45).fillCircle(0, 0, size / 2);
      g.lineStyle(4, 0xffffff, pressed ? 1 : 0.8).strokeCircle(0, 0, size / 2);
    };
    draw(false);
    const t = this.add
      .text(0, 0, label, { fontFamily: FONT_HEADING, fontSize: `${fontSize}px`, fontStyle: '700', color: '#ffffff', padding: { top: 8, bottom: 4 } })
      .setOrigin(0.5);
    c.add([g, t]);
    const d = Math.max(size, MIN_TOUCH_SIZE);
    c.setSize(d, d).setInteractive(new Phaser.Geom.Circle(d / 2, d / 2, d / 2), Phaser.Geom.Circle.Contains);
    c.on('pointerdown', () => {
      draw(true);
      onDown && onDown();
    });
    const release = () => {
      draw(false);
      onUp && onUp();
    };
    c.on('pointerup', release);
    c.on('pointerout', release);
    return c;
  }

  buildTouchControls() {
    const im = this.input_;
    const y = GAME_HEIGHT - 100;
    this.laneButtons = [
      this.holdButton(96, y, UI_TEXT.laneLeft, { onDown: () => im.pressLeft() }),
      this.holdButton(240, y, UI_TEXT.laneRight, { onDown: () => im.pressRight() })
    ];
    this.holdButton(GAME_WIDTH - 96, y - 150, UI_TEXT.accelerate, {
      onDown: () => im.setButtonThrottle(1),
      onUp: () => im.buttonThrottle === 1 && im.setButtonThrottle(0),
      color: 0x1f7a3a,
      fontSize: 34
    });
    this.holdButton(GAME_WIDTH - 96, y, UI_TEXT.brake, {
      onDown: () => im.setButtonThrottle(-1),
      onUp: () => im.buttonThrottle === -1 && im.setButtonThrottle(0),
      color: 0xb91c1c,
      fontSize: 34
    });

    // ปุ่มสลับ "ปุ่มกด / เอียงเครื่อง" มุมขวาบน (จำค่าไว้)
    this.modeButton = new Button(this, GAME_WIDTH - 170, 64, '', () => this.toggleMode(), {
      width: 320,
      height: 88,
      fontSize: 28,
      fill: 0x1e293b,
      fillHover: 0x334155
    }).setDepth(40);

    const saved = loadControlMode();
    const perm = this.registry.get('tiltPermission');
    if (saved === 'tilt' && perm === 'granted') this.setMode('tilt', { silent: true });
    else this.setMode('buttons');
  }

  async toggleMode() {
    if (this.mode === 'tilt') {
      this.setMode('buttons');
      saveControlMode('buttons');
      return;
    }
    // การแตะปุ่มนี้เป็น gesture ของผู้ใช้: ขออนุญาตบน iOS ได้อีกครั้ง
    const perm = await requestTiltPermission();
    this.registry.set('tiltPermission', perm);
    if (perm !== 'granted') {
      this.toast(perm === 'denied' ? UI_TEXT.tiltDenied : UI_TEXT.tiltUnsupported);
      return;
    }
    this.setMode('tilt');
    saveControlMode('tilt');
  }

  async setMode(mode, { silent = false } = {}) {
    this.mode = mode;
    this.modeButton.label.setText(UI_TEXT.modePrefix + (mode === 'tilt' ? UI_TEXT.modeTilt : UI_TEXT.modeButtons));
    // โหมดเอียง: ซ่อนปุ่มเลี้ยว (เร่ง/เบรกยังใช้ปุ่ม)
    this.laneButtons.forEach((b) => b.setVisible(mode !== 'tilt').input && (b.input.enabled = mode !== 'tilt'));
    if (mode === 'tilt') {
      const res = await this.input_.enableTilt();
      if (res !== 'ok' && this.mode === 'tilt' && this.scene.isActive()) {
        // ไม่มีค่าเซนเซอร์เข้ามา: กลับไปใช้ปุ่ม
        this.setMode('buttons');
        saveControlMode('buttons');
        if (!silent) this.toast(UI_TEXT.tiltUnsupported);
      }
    } else {
      this.input_.disableTilt();
    }
  }

  toast(text) {
    const t = this.add
      .text(GAME_WIDTH / 2, 150, text, {
        fontFamily: FONT_BODY,
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { left: 20, right: 20, top: 10, bottom: 8 }
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({ targets: t, alpha: 0, delay: 2500, duration: 500, onComplete: () => t.destroy() });
  }

  // ---------- โหมด Debug ----------

  buildDebug() {
    debugButton(this, GAME_WIDTH / 2 - 90, 60, 'ข้ามช่วงขับ', () => {
      this.sim.elapsed = this.sim.duration;
    });
    this.dbgLabel = debugLabel(this, 230, 20, '');
  }

  // ---------- วนทุกเฟรม ----------

  update(_t, deltaMs) {
    const dt = Math.min(deltaMs, 100) / 1000; // จำกัด delta กันกระตุกตอนสลับแท็บ
    this.input_.update();
    const events = this.sim.update(dt, { throttle: this.input_.throttle, laneTarget: this.input_.laneTarget });

    for (const e of events) {
      if (e === 'hit') this.onHit();
      if (e === 'stopping') this.input_.lock();
      if (e === 'stopped') this.time.delayedCall(500, () => goTo(this, FLOW.afterDrive, { index: this.index }, 500));
    }
    // ถ้าเป็นเลนที่ sim เลือก ให้ input จำตามด้วย (กันกดเกินขอบ)
    this.input_.laneTarget = this.sim.lane;

    this.drawRoad();
    this.drawCars();
    this.drawPlayer();
    this.drawHud();

    if (this.dbgLabel) {
      const tl = this.input_.tilt;
      this.dbgLabel.setText(
        `t ${this.sim.elapsed.toFixed(1)}/${this.sim.duration}s  lane ${this.sim.lane}  hits ${this.sim.hits}  tilt ${tl.value.toFixed(1)}°`
      );
    }
  }

  drawRoad() {
    const g = this.roadG;
    g.clear();
    const quad = (x0, x1, za, zb, color, alpha = 1) => {
      const a = project(x0, za);
      const b = project(x1, za);
      const c = project(x1, zb);
      const d = project(x0, zb);
      g.fillStyle(color, alpha);
      g.fillPoints([a, b, c, d], true);
    };

    // พื้นถนน
    quad(-ROAD_HALF, ROAD_HALF, Z_NEAR, Z_FAR, 0x55595e);
    // ความลึก: ถนนไกลๆ สว่างขึ้นนิดหน่อย
    quad(-ROAD_HALF, ROAD_HALF, 18, Z_FAR, 0x6f7378, 0.6);

    const off = this.sim.distance % DASH_PERIOD;
    for (let z = DASH_PERIOD - off; z < Z_FAR; z += DASH_PERIOD) {
      const za = Math.max(Z_NEAR, z);
      const zb = Math.min(Z_FAR, z + DASH_LEN);
      if (zb <= za) continue;
      // เส้นแบ่งเลน (ประ)
      for (let i = 1; i < CONFIG.LANES; i++) {
        const lx = i - CONFIG.LANES / 2;
        quad(lx - 0.035, lx + 0.035, za, zb, 0xffffff, 0.9);
      }
      // ขอบทาง ขาว-ดำสลับ
      quad(-ROAD_HALF - CURB_W, -ROAD_HALF, za, zb, 0xf2f2f2);
      quad(ROAD_HALF, ROAD_HALF + CURB_W, za, zb, 0xf2f2f2);
    }
    for (let z = DASH_PERIOD - off + DASH_LEN; z < Z_FAR; z += DASH_PERIOD) {
      const za = Math.max(Z_NEAR, z);
      const zb = Math.min(Z_FAR, z + (DASH_PERIOD - DASH_LEN));
      if (zb <= za) continue;
      quad(-ROAD_HALF - CURB_W, -ROAD_HALF, za, zb, 0x222222);
      quad(ROAD_HALF, ROAD_HALF + CURB_W, za, zb, 0x222222);
    }
    // เส้นขอบเลนทึบ
    quad(-ROAD_HALF + 0.02, -ROAD_HALF + 0.07, Z_NEAR, Z_FAR, 0xffffff, 0.85);
    quad(ROAD_HALF - 0.07, ROAD_HALF - 0.02, Z_NEAR, Z_FAR, 0xffffff, 0.85);
  }

  drawCar(g, n) {
    const p = project(this.sim.laneX(n.lane), n.z);
    const w = 0.78 * p.s;
    const h = 0.62 * p.s;
    const x = p.x - w / 2;
    const y = p.y - h;
    const alpha = Phaser.Math.Clamp((Z_FAR - n.z) / 12, 0, 1); // ค่อยๆ ปรากฏจากไกล
    g.fillStyle(0x000000, 0.3 * alpha).fillEllipse(p.x, p.y, w * 1.1, h * 0.18);
    g.fillStyle(n.color, alpha).fillRoundedRect(x, y + h * 0.28, w, h * 0.62, Math.max(2, w * 0.08));
    g.fillStyle(n.color, alpha).fillRoundedRect(x + w * 0.12, y, w * 0.76, h * 0.4, Math.max(2, w * 0.1));
    g.fillStyle(0x1b2633, 0.9 * alpha).fillRoundedRect(x + w * 0.18, y + h * 0.06, w * 0.64, h * 0.26, Math.max(1, w * 0.05));
    g.fillStyle(0xff2a2a, alpha).fillRect(x + w * 0.05, y + h * 0.42, w * 0.16, h * 0.1).fillRect(x + w * 0.79, y + h * 0.42, w * 0.16, h * 0.1);
    g.fillStyle(0x111111, alpha).fillRect(x + w * 0.06, y + h * 0.88, w * 0.18, h * 0.12).fillRect(x + w * 0.76, y + h * 0.88, w * 0.18, h * 0.12);
    g.fillStyle(0xeeeeee, alpha).fillRect(x + w * 0.38, y + h * 0.62, w * 0.24, h * 0.1); // ป้ายทะเบียน
  }

  drawCars() {
    this.carsFarG.clear();
    this.carsNearG.clear();
    const sorted = [...this.sim.npcs].filter((n) => n.z > Z_NEAR + 0.15).sort((a, b) => b.z - a.z);
    for (const n of sorted) {
      this.drawCar(n.z >= DRIVE.PLAYER_Z ? this.carsFarG : this.carsNearG, n);
    }
  }

  drawPlayer() {
    const p = project(this.sim.playerX, DRIVE.PLAYER_Z);
    this.player.setPosition(p.x, p.y);
    // เอียงตัวรถตามการเปลี่ยนเลน
    this.player.rotation = Phaser.Math.Clamp(this.sim.lateralVelocity * 0.06, -0.22, 0.22);
    // กระพริบตอนชน
    if (this.sim.invuln > 0) this.player.setAlpha(Math.floor(this.sim.invuln * 10) % 2 === 0 ? 0.25 : 1);
    else this.player.setAlpha(1);
  }

  onHit() {
    playSfx('bump');
    this.cameras.main.shake(200, 0.008);
  }
}
