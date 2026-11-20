import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CONFIG } from './config.js';
import BootScene from './scenes/BootScene.js';
import IntroScene from './scenes/IntroScene.js';
import PendingScene from './scenes/PendingScene.js';
import { isTouchDevice } from './systems/InputManager.js';

// รอฟอนต์ Prompt / Sarabun โหลดเสร็จก่อนเริ่มเกม (ไม่เกิน 4 วินาที กันเน็ตช้าแล้วค้าง)
async function waitForFonts(timeoutMs = 4000) {
  if (!document.fonts || !document.fonts.load) return;
  const loads = Promise.all([
    document.fonts.load('400 24px Sarabun', 'ทดสอบ'),
    document.fonts.load('600 24px Sarabun', 'ทดสอบ'),
    document.fonts.load('400 24px Prompt', 'ทดสอบ'),
    document.fonts.load('600 24px Prompt', 'ทดสอบ'),
    document.fonts.load('700 24px Prompt', 'ทดสอบ')
  ]).catch(() => {});
  const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([loads, timeout]);
}

// หน้าจอบังคับแนวนอน: แสดงเฉพาะอุปกรณ์จอสัมผัสที่ถือแนวตั้ง และหยุดเกมไว้ระหว่างนั้น
function setupOrientationGuard(game) {
  const touch = isTouchDevice();
  const check = () => {
    const portrait = window.innerHeight > window.innerWidth;
    const block = touch && portrait;
    document.body.classList.toggle('is-portrait', block);
    if (!game.loop) return;
    if (block && !game.loop.sleeping) game.loop.sleep();
    if (!block && game.loop.sleeping) game.loop.wake();
    game.scale.refresh();
  };
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', () => setTimeout(check, 200));
  check();
}

async function start() {
  await waitForFonts();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#000000',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT
    },
    input: { activePointers: 3 }, // มือถือ: กดหลายนิ้วพร้อมกัน (เลี้ยว + เร่ง)
    render: { antialias: true },
    banner: false,
    scene: [BootScene, IntroScene, PendingScene]
  });

  game.events.once(Phaser.Core.Events.READY, () => setupOrientationGuard(game));

  if (CONFIG.DEBUG) {
    window.__game = game; // ให้เปิดดูใน console ได้ตอน debug
    console.info('[PIM Safety] Debug mode', { ...CONFIG });
  }
}

start();
