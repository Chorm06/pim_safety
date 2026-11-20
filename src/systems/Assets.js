// ตัวช่วยตั้งชื่อ texture key และ path ของภาพ ให้ทุก Scene ใช้ชื่อเดียวกัน
// ภาพต่อข้อ: title, story, question, choices, lesson + anim frames (อ่านจาก scenario.json)

export const SCENARIO_IMAGES = ['title', 'story', 'question', 'choices', 'lesson'];

export const INTRO_KEY = 'intro';
export const INTRO_PATH = 'assets/intro.jpg';

/** key ของภาพประจำข้อ เช่น sc1_title */
export function imageKey(scenarioId, name) {
  return `sc${scenarioId}_${name}`;
}

/** key ของเฟรมแอนิเมชัน เช่น sc1_anim_0 */
export function animKey(scenarioId, index) {
  return `sc${scenarioId}_anim_${index}`;
}

/** รายการภาพทั้งหมดที่ต้องโหลด [{key, path}] */
export function listAllImages(scenarios) {
  const list = [{ key: INTRO_KEY, path: INTRO_PATH }];
  for (const sc of scenarios) {
    for (const name of SCENARIO_IMAGES) {
      list.push({ key: imageKey(sc.id, name), path: `${sc.assets}${name}.jpg` });
    }
    (sc.anim_frames || []).forEach((file, i) => {
      list.push({ key: animKey(sc.id, i), path: `${sc.assets}${file}` });
    });
  }
  return list;
}
