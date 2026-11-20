import Phaser from 'phaser';
import Button from './Button.js';
import { wrapThai } from './ThaiText.js';
import { GAME_WIDTH, GAME_HEIGHT, FONT_HEADING, FONT_BODY } from '../config.js';

// ข้อความส่วนท้ายที่ใช้ซ้ำในป๊อปอัปตอบผิด ใช้แยกบรรทัดสีแดง/สีเทาตามแบบ ref_popup
// (แยกการแสดงผลเท่านั้น ไม่ได้เปลี่ยนถ้อยคำ)
const SECONDARY_MARKER = 'ยังมีจุดที่ต้องระวัง';

const RED = 0xd62828;
const GREEN = 0x1f7a3a;

/**
 * ป๊อปอัปกลางจอ: กล่องขาว ขอบแดง ข้อความหลักสีแดง + ปุ่ม
 * variant: 'wrong' (ปุ่มแดง) | 'info' (ปุ่มเขียว)
 */
export default class Popup extends Phaser.GameObjects.Container {
  constructor(scene, { message, variant = 'wrong', buttonLabel, onClose }) {
    super(scene, 0, 0);
    this.onClose = onClose;
    this.closing = false;
    this.setDepth(1000);

    // พื้นหลังมืด กันการกดตัวเลือกด้านหลัง
    const dim = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setInteractive();
    this.add(dim);

    const boxW = 820;
    const textW = boxW - 120;
    const msg = message && message.trim() ? message : '[รอเนื้อหา]';

    // แยกส่วนหลัก (แดง) กับส่วนรอง (เทา) ถ้ามีข้อความส่วนท้าย
    let main = msg;
    let secondary = '';
    const cut = msg.indexOf(SECONDARY_MARKER);
    if (variant === 'wrong' && cut > 0) {
      main = msg.slice(0, cut).trim();
      secondary = msg.slice(cut).trim();
    }

    const mainStyle = {
      fontFamily: FONT_HEADING,
      fontSize: '40px',
      fontStyle: '600',
      color: '#d62828',
      align: 'center',
      lineSpacing: 6,
      padding: { top: 10, bottom: 4 }
    };
    const secStyle = {
      fontFamily: FONT_BODY,
      fontSize: '32px',
      color: '#333333',
      align: 'center',
      lineSpacing: 6,
      padding: { top: 8, bottom: 4 }
    };

    const mainText = scene.add.text(0, 0, wrapThai(main, mainStyle, textW), mainStyle).setOrigin(0.5, 0);
    const secText = secondary ? scene.add.text(0, 0, wrapThai(secondary, secStyle, textW), secStyle).setOrigin(0.5, 0) : null;

    const btnH = 96;
    const gap = 26;
    const padTop = 56;
    const padBottom = 44;
    const textH = mainText.height + (secText ? gap + secText.height : 0);
    const boxH = padTop + textH + gap + 10 + btnH + padBottom;

    const cx = GAME_WIDTH / 2;
    const top = GAME_HEIGHT / 2 - boxH / 2;

    const box = scene.add.container(cx, GAME_HEIGHT / 2);
    const g = scene.add.graphics();
    const bx = -boxW / 2;
    const by = -boxH / 2;
    g.fillStyle(0x000000, 0.25).fillRoundedRect(bx + 6, by + 10, boxW, boxH, 28);
    g.fillStyle(0xffffff, 1).fillRoundedRect(bx, by, boxW, boxH, 28);
    g.lineStyle(5, RED, 1).strokeRoundedRect(bx, by, boxW, boxH, 28);
    // แถบแดงมุมซ้ายบน/ขวาล่าง ตามแบบ ref_popup
    g.fillStyle(RED, 1);
    g.fillRoundedRect(bx, by, 170, 16, { tl: 28, tr: 8, bl: 0, br: 8 });
    g.fillRoundedRect(bx, by, 16, 120, { tl: 28, tr: 0, bl: 8, br: 8 });
    g.fillRoundedRect(bx + boxW - 170, by + boxH - 16, 170, 16, { tl: 8, tr: 0, bl: 8, br: 28 });
    g.fillRoundedRect(bx + boxW - 16, by + boxH - 120, 16, 120, { tl: 8, tr: 8, bl: 0, br: 28 });
    box.add(g);

    mainText.setPosition(0, by + padTop);
    box.add(mainText);
    if (secText) {
      secText.setPosition(0, by + padTop + mainText.height + gap);
      box.add(secText);
    }

    const btn = new Button(scene, 0, by + boxH - padBottom - btnH / 2, buttonLabel, () => this.close(), {
      width: 300,
      height: btnH,
      fill: variant === 'wrong' ? RED : GREEN,
      fillHover: variant === 'wrong' ? 0xef3b3b : 0x29a04c
    });
    box.add(btn);
    this.button = btn;
    this.add(box);

    // เด้งเข้า
    box.setScale(0.85);
    box.setAlpha(0);
    scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.box = box;
    this.top = top;

    scene.add.existing(this);
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    this.scene.tweens.add({
      targets: this.box,
      scale: 0.9,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        const cb = this.onClose;
        this.destroy();
        cb && cb();
      }
    });
  }
}
