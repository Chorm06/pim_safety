import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

// วางภาพเต็มพื้นที่แบบ cover (เต็มจอ ตัดขอบเกิน) หรือ contain (เห็นครบทั้งภาพ)
// คืนค่า image object ที่มีข้อมูล fit ไว้ใช้แปลงพิกัดสัดส่วน 0–1 ของภาพ → พิกัดจอ

function place(scene, key, mode, area) {
  const { x = 0, y = 0, width = GAME_WIDTH, height = GAME_HEIGHT } = area || {};
  const img = scene.add.image(x + width / 2, y + height / 2, key);
  const tex = img.frame;
  const sx = width / tex.realWidth;
  const sy = height / tex.realHeight;
  const scale = mode === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
  img.setScale(scale);

  if (mode === 'cover') {
    // ตัดส่วนที่ล้นออกนอกพื้นที่ (สำคัญเมื่อพื้นที่ไม่ใช่เต็มจอ)
    const maskShape = scene.make.graphics({ add: false });
    maskShape.fillRect(x, y, width, height);
    img.setMask(maskShape.createGeometryMask());
  }

  img.fitInfo = { scale, mode, area: { x, y, width, height } };
  return img;
}

export function addCoverImage(scene, key, area) {
  return place(scene, key, 'cover', area);
}

export function addContainImage(scene, key, area) {
  return place(scene, key, 'contain', area);
}

/** แปลงพิกัดสัดส่วน (0–1) บนภาพ → พิกัดจอ */
export function imageToScreen(img, fx, fy) {
  return {
    x: img.x + (fx - 0.5) * img.displayWidth,
    y: img.y + (fy - 0.5) * img.displayHeight
  };
}

/** แปลงพิกัดจอ → สัดส่วน (0–1) บนภาพ (ใช้ในโหมด Debug) */
export function screenToImage(img, sx, sy) {
  return {
    x: (sx - img.x) / img.displayWidth + 0.5,
    y: (sy - img.y) / img.displayHeight + 0.5
  };
}
