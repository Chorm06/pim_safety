// DriveSim — logic ช่วงขับ (ไม่มีส่วนแสดงผล)
// พิกัดโลก: x = ตำแหน่งข้างทาง (เลนกลาง = 0, กว้างเลนละ 1), z = ระยะข้างหน้าจากกล้อง
// ความเร็วเก็บเป็น km/h สำหรับแสดงผล แล้วแปลงเป็นหน่วยโลก/วินาที

export const DRIVE = {
  START_SPEED: 40,
  MAX_SPEED: 90,
  ACCEL: 30, // km/h ต่อวินาที ตอนกดเร่ง
  BRAKE: 55, // km/h ต่อวินาที ตอนกดเบรก
  STOP_DECEL: 45, // km/h ต่อวินาที ตอนชะลอเข้าจุดเสี่ยง
  UNITS_PER_KMH: 0.2, // 60 km/h = 12 หน่วย/วินาที
  LANE_EASE: 9, // ความนุ่มของการเปลี่ยนเลน (มาก = เร็ว)
  PLAYER_Z: 1.1,
  HIT_Z_MIN: 0.95,
  HIT_Z_MAX: 1.55,
  INVULN_SEC: 1.3,
  SPAWN_Z: 48,
  SPAWN_MIN_SEC: 1.1,
  SPAWN_MAX_SEC: 2.2,
  NPC_SPEED_MIN: 15,
  NPC_SPEED_MAX: 40
};

const NPC_COLORS = [0xe74c3c, 0x3498db, 0xecf0f1, 0x2c3e50, 0x95a5a6, 0x16a085, 0x8e44ad];

export default class DriveSim {
  constructor({ lanes = 3, durationSec = 20, rng = Math.random } = {}) {
    this.lanes = lanes;
    this.duration = durationSec;
    this.rng = rng;
    this.speed = DRIVE.START_SPEED;
    this.distance = 0;
    this.elapsed = 0;
    this.phase = 'drive'; // 'drive' → 'stopping' → 'stopped'
    this.lane = Math.floor(lanes / 2);
    this.playerX = this.laneX(this.lane);
    this.prevX = this.playerX;
    this.npcs = [];
    this.spawnIn = 1.2;
    this.invuln = 0;
    this.hits = 0;
  }

  laneX(lane) {
    return lane - (this.lanes - 1) / 2;
  }

  get progress() {
    return Math.min(1, this.elapsed / this.duration);
  }

  get lateralVelocity() {
    return this.velX || 0;
  }

  /** dt = วินาที, input = {throttle: -1|0|1, laneTarget} คืนรายการเหตุการณ์ */
  update(dt, input) {
    const events = [];
    if (this.phase === 'stopped') return events;

    this.elapsed += dt;
    if (this.phase === 'drive' && this.elapsed >= this.duration) {
      this.phase = 'stopping';
      events.push('stopping');
    }

    // ความเร็ว
    if (this.phase === 'stopping') {
      this.speed = Math.max(0, this.speed - DRIVE.STOP_DECEL * dt);
    } else if (input.throttle > 0) {
      this.speed = Math.min(DRIVE.MAX_SPEED, this.speed + DRIVE.ACCEL * dt);
    } else if (input.throttle < 0) {
      this.speed = Math.max(0, this.speed - DRIVE.BRAKE * dt);
    }
    const v = this.speed * DRIVE.UNITS_PER_KMH;
    this.distance += v * dt;

    // เปลี่ยนเลนแบบเลื่อนนุ่มๆ
    if (this.phase === 'drive') this.lane = input.laneTarget;
    const tx = this.laneX(this.lane);
    this.prevX = this.playerX;
    this.playerX += (tx - this.playerX) * Math.min(1, dt * DRIVE.LANE_EASE);
    this.velX = dt > 0 ? (this.playerX - this.prevX) / dt : 0;

    // รถ NPC
    if (this.phase === 'drive') {
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        this.spawn();
        this.spawnIn = DRIVE.SPAWN_MIN_SEC + this.rng() * (DRIVE.SPAWN_MAX_SEC - DRIVE.SPAWN_MIN_SEC);
      }
    }
    for (const n of this.npcs) {
      n.prevZ = n.z;
      n.z -= (this.speed - n.speed) * DRIVE.UNITS_PER_KMH * dt;
    }

    // ชน: ไม่ทำให้แพ้ แค่กระพริบ
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.invuln === 0) {
      for (const n of this.npcs) {
        if (n.hit) continue;
        const sameLane = Math.abs(this.playerX - this.laneX(n.lane)) < 0.55;
        // ตรวจทั้งช่วงที่รถเคลื่อนผ่านในเฟรมนี้ (กันเฟรมเรตต่ำแล้ววิ่งทะลุ)
        const lo = Math.min(n.z, n.prevZ ?? n.z);
        const hi = Math.max(n.z, n.prevZ ?? n.z);
        if (sameLane && hi > DRIVE.HIT_Z_MIN && lo < DRIVE.HIT_Z_MAX) {
          n.hit = true;
          this.hits += 1;
          this.invuln = DRIVE.INVULN_SEC;
          events.push('hit');
          break;
        }
      }
    }

    // ลบรถที่ผ่านไปแล้ว (หลังตรวจชน)
    this.npcs = this.npcs.filter((n) => n.z > 0.4 && n.z < 70);

    if (this.phase === 'stopping' && this.speed <= 0) {
      this.phase = 'stopped';
      events.push('stopped');
    }
    return events;
  }

  spawn() {
    // ไม่ปล่อยรถถ้าผู้เล่นช้ากว่ารถ NPC (รถจะไม่เข้ามาใกล้)
    if (this.speed < DRIVE.NPC_SPEED_MIN + 8) return;
    // ไม่ให้รถคันใหม่ซ้อนเลนเดียวกับคันที่ยังอยู่ไกล (กันปิดทางทั้งหมด)
    const farLanes = new Set(this.npcs.filter((n) => n.z > DRIVE.SPAWN_Z - 14).map((n) => n.lane));
    const free = [...Array(this.lanes).keys()].filter((l) => !farLanes.has(l));
    if (free.length === 0 || farLanes.size >= this.lanes - 1) return;
    const lane = free[Math.floor(this.rng() * free.length)];
    const maxNpc = Math.min(DRIVE.NPC_SPEED_MAX, this.speed - 8);
    const speed = DRIVE.NPC_SPEED_MIN + this.rng() * Math.max(0, maxNpc - DRIVE.NPC_SPEED_MIN);
    const color = NPC_COLORS[Math.floor(this.rng() * NPC_COLORS.length)];
    this.npcs.push({ lane, z: DRIVE.SPAWN_Z, speed, color, hit: false });
  }
}
