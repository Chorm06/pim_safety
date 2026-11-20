// ค่าตั้งค่าของเกม — ยังไม่ได้ตัดสิน เปลี่ยนได้จากไฟล์นี้ไฟล์เดียว
export const CONFIG = {
  DECISION_TIME_SEC: 5,        // เวลาตัดสินใจเลือกจุดเสี่ยง (กำลังพิจารณา 3 หรือ 5)
  SAVE_EXPIRE_DAYS: 7,         // เกินกี่วันแล้วรีเซ็ตความคืบหน้า (กำลังพิจารณา 3 หรือ 7)
  DRIVE_DURATION_SEC: 20,      // ระยะเวลาช่วงขับก่อนถึงจุดเสี่ยง
  LANES: 3,
  DEBUG: false                 // หรือเปิดด้วย ?debug=1 ใน URL
};

// ค่าคงที่ด้านการแสดงผล (ไม่ใช่เนื้อหา)
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const MIN_TOUCH_SIZE = 88; // ปุ่มบนจอต้องไม่เล็กกว่านี้ (px ที่ขนาดฐาน)
export const FONT_HEADING = 'Prompt, Sarabun, sans-serif';
export const FONT_BODY = 'Sarabun, Prompt, sans-serif';

// อ่านค่าจาก URL เพื่อให้ผู้ทดสอบลองได้โดยไม่ต้องแก้โค้ด
//   ?time=3   → DECISION_TIME_SEC = 3
//   ?debug=1  → เปิดโหมด Debug
(function applyUrlOverrides() {
  let params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return;
  }

  const time = Number(params.get('time'));
  if (Number.isFinite(time) && time > 0 && time <= 60) {
    CONFIG.DECISION_TIME_SEC = time;
  }

  const debug = params.get('debug');
  if (debug === '1' || debug === 'true') {
    CONFIG.DEBUG = true;
  }
})();
