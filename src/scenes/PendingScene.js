import Phaser from 'phaser';
import Button from '../ui/Button.js';
import { GAME_WIDTH, FONT_HEADING, FONT_BODY } from '../config.js';

// ฉากชั่วคราวของ Step 2: แสดงผลข้อที่ตอบถูก แทน Accident/Lesson (ทำใน Step 3)
export default class PendingScene extends Phaser.Scene {
  constructor() {
    super('PendingScene');
  }

  init(data) {
    this.data_ = data || {};
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1f3a');
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const cx = GAME_WIDTH / 2;
    const scenarios = this.registry.get('scenarios') || [];
    const { index = 0, result } = this.data_;
    const next = index + 1;

    this.add
      .text(cx, 130, '[AccidentScene / LessonScene จะทำใน Step 3]', {
        fontFamily: FONT_HEADING, fontSize: '40px', fontStyle: '700', color: '#ffe066', padding: { top: 10, bottom: 4 }
      })
      .setOrigin(0.5);

    const lines = result
      ? [`ข้อ ${result.id}: ตอบถูกแล้ว`, `จำนวนครั้งที่เลือก: ${result.attempts}`, `เวลาที่ใช้: ${result.timeSec} วินาที`]
      : ['ยังไม่มีผล'];
    this.add
      .text(cx, 300, lines.join('\n'), {
        fontFamily: FONT_BODY, fontSize: '36px', color: '#ffffff', align: 'center', lineSpacing: 12, padding: { top: 8, bottom: 4 }
      })
      .setOrigin(0.5);

    if (next < scenarios.length) {
      new Button(this, cx - 200, 560, `ข้อถัดไป (${next + 1})`, () => this.scene.start('HazardScene', { index: next }));
      new Button(this, cx + 200, 560, 'กลับหน้าแรก', () => this.scene.start('IntroScene'), { fill: 0x334155, fillHover: 0x475569 });
    } else {
      new Button(this, cx, 560, 'กลับหน้าแรก', () => this.scene.start('IntroScene'));
    }
  }
}
