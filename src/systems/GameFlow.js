// GameFlow — ลำดับฉากของเกมรวมไว้ที่เดียว
//   Intro → [ต่อข้อ] Title → Drive → Hazard → Accident → Lesson → ... → Result

export const FLOW = {
  afterIntro: 'TitleScene',
  afterTitle: 'DriveScene',
  afterDrive: 'HazardScene',
  afterHazard: 'AccidentScene',
  afterAccident: 'LessonScene',
  afterLastLesson: 'ResultScene'
};

/** เปลี่ยนฉากแบบ fade ดำ */
export function goTo(scene, key, data = {}, ms = 300) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.cameras.main.fadeOut(ms, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

/** ข้อถัดไปหลังจบ Lesson ของข้อ index */
export function nextAfterLesson(scene, index) {
  const scenarios = scene.registry.get('scenarios') || [];
  if (index + 1 < scenarios.length) return { key: FLOW.afterIntro, data: { index: index + 1 } };
  return { key: FLOW.afterLastLesson, data: {} };
}

/** ข้อความสำหรับโปรแกรมอ่านหน้าจอ (alt text) */
export function setScreenReaderText(text) {
  const el = typeof document !== 'undefined' && document.getElementById('sr-text');
  if (el) el.textContent = text || '';
}
