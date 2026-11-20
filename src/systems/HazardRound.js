// HazardRound — logic ของการเลือกจุดเสี่ยง 1 ข้อ (ไม่มีส่วนแสดงผล)
// นับจำนวนครั้งที่เลือก, ตัวเลือกที่ถูกตัดออก (ตอบผิดแล้วหายไป), สถานะตอบถูก

export default class HazardRound {
  constructor(choices) {
    this.choices = choices;
    this.removed = new Set();
    this.attempts = 0; // จำนวนครั้งที่เลือกทั้งหมด (รวมครั้งที่ถูก)
    this.solved = false;
  }

  isAvailable(key) {
    return !this.solved && !this.removed.has(key) && this.choices.some((c) => c.key === key);
  }

  get wrongCount() {
    return this.removed.size;
  }

  /** เลือกตัวเลือก คืนค่า {correct, choice} หรือ null ถ้าเลือกไม่ได้ */
  select(key) {
    if (!this.isAvailable(key)) return null;
    const choice = this.choices.find((c) => c.key === key);
    this.attempts += 1;
    if (choice.correct) {
      this.solved = true;
      return { correct: true, choice };
    }
    this.removed.add(key);
    return { correct: false, choice };
  }
}
