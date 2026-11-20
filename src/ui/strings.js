// ข้อความ UI ของระบบ (ปุ่ม/หัวข้อ/ป้ายกำกับ) — ไม่ใช่เนื้อหาความปลอดภัย
// เนื้อหาความปลอดภัยทั้งหมดอยู่ใน public/data/scenario.json
export const UI_TEXT = {
  // HazardScene
  timeout: 'กรุณาเลือกจุดที่คิดว่าเสี่ยงที่สุด',
  timeoutButton: 'ตกลง',
  retryButton: 'ลองใหม่',

  // DriveScene
  accelerate: 'เร่ง',
  brake: 'เบรก',
  laneLeft: '◀',
  laneRight: '▶',
  modeButtons: 'ปุ่มกด',
  modeTilt: 'เอียงเครื่อง',
  modePrefix: 'ควบคุม: ',
  keyboardHint: '← → เปลี่ยนเลน   ↑ เร่ง   ↓ เบรก',
  tiltDenied: 'ไม่ได้รับอนุญาตให้ใช้การเอียงเครื่อง ใช้ปุ่มกดแทน',
  tiltUnsupported: 'อุปกรณ์นี้ไม่รองรับการเอียงเครื่อง ใช้ปุ่มกดแทน',
  speedUnit: 'km/h',

  // ResultScene
  missionCompleted: 'Mission Completed',
  firstTryPercent: 'ตอบถูกในครั้งแรก',
  totalWrong: 'จำนวนครั้งที่เลือกผิดรวม',
  totalTime: 'เวลารวม',
  colNo: 'ข้อ',
  colTitle: 'หัวข้อ',
  colAttempts: 'จำนวนครั้งที่เลือก',
  colWrong: 'ผิด',
  colTime: 'เวลา',
  secondsUnit: 'วินาที',
  timesUnit: 'ครั้ง',
  playAgain: 'เล่นใหม่',

  // placeholder ตัวละคร (ยังไม่มีมาสคอต)
  mascotPlaceholder: 'พี่วินัย'
};
