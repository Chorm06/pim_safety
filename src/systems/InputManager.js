// InputManager — Step 1 มีเฉพาะการขออนุญาตใช้เซนเซอร์เอียงเครื่อง
// (คีย์บอร์ด / ปุ่มบนจอ / การเอียงเครื่องจริง จะเพิ่มใน Step 4)

/**
 * ขออนุญาต DeviceOrientation
 * - iOS 13+ ต้องเรียก DeviceOrientationEvent.requestPermission() จากการแตะของผู้ใช้เท่านั้น
 * - Android / Desktop ไม่ต้องขอ
 * คืนค่า 'granted' | 'denied' | 'unsupported'
 */
export async function requestTiltPermission() {
  if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') {
    return 'unsupported';
  }
  const DOE = window.DeviceOrientationEvent;
  if (typeof DOE.requestPermission === 'function') {
    try {
      const result = await DOE.requestPermission();
      return result === 'granted' ? 'granted' : 'denied';
    } catch {
      // เช่น ไม่ได้เรียกจากการแตะ หรือผู้ใช้ปิดไว้
      return 'denied';
    }
  }
  return 'granted';
}

/** เป็นอุปกรณ์จอสัมผัสหรือไม่ */
export function isTouchDevice() {
  try {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  } catch {
    return false;
  }
}
