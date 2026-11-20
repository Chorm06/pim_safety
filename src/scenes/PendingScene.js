import Phaser from 'phaser';
import Button from '../ui/Button.js';
import { GAME_WIDTH, GAME_HEIGHT, FONT_HEADING, FONT_BODY } from '../config.js';

// ฉากชั่วคราวของ Step 1: แสดงว่ากดเริ่มแล้วเข้ามาได้ (จะถูกแทนด้วย TitleScene ใน Step 3)
export default class PendingScene extends Phaser.Scene {
  constructor() {
    super('PendingScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1f3a');
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const cx = GAME_WIDTH / 2;
    const scenarios = this.registry.get('scenarios') || [];
    const tilt = this.registry.get('tiltPermission');

    this.add
      .text(cx, 170, '[ฉากถัดไปจะทำใน Step 2–3]', {
        fontFamily: FONT_HEADING, fontSize: '44px', fontStyle: '700', color: '#ffe066', padding: { top: 10, bottom: 4 }
      })
      .setOrigin(0.5);

    // ข้อมูลตรวจสอบสำหรับผู้ทดสอบ (อ่านจาก scenario.json จริง)
    const lines = [
      `โหลด scenario.json แล้ว: ${scenarios.length} ข้อ`,
      ...scenarios.map((s) => `ข้อ ${s.id}: ${s.title}`),
      `สิทธิ์เซนเซอร์เอียงเครื่อง: ${tilt}`
    ];
    this.add
      .text(cx, 330, lines.join('\n'), {
        fontFamily: FONT_BODY, fontSize: '30px', color: '#ffffff', align: 'center', lineSpacing: 10, padding: { top: 8, bottom: 4 }
      })
      .setOrigin(0.5);

    new Button(this, cx, GAME_HEIGHT - 130, 'กลับหน้าแรก', () => this.scene.start('IntroScene'));
  }
}
