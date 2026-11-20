// คำนวณสรุปผล (logic ล้วน ไม่มีการแสดงผล)
// results: [{id, attempts, timeSec}]  scenarios: จาก scenario.json

export function summarize(scenarios, results) {
  const rows = scenarios.map((sc) => {
    const r = results.find((x) => x.id === sc.id);
    return {
      id: sc.id,
      title: sc.title,
      attempts: r ? r.attempts : null,
      wrong: r ? Math.max(0, r.attempts - 1) : null,
      timeSec: r ? r.timeSec : null,
      firstTry: r ? r.attempts === 1 : false
    };
  });
  const done = rows.filter((r) => r.attempts !== null);
  const total = scenarios.length || 1;
  return {
    rows,
    firstTryPercent: Math.round((rows.filter((r) => r.firstTry).length / total) * 100),
    totalWrong: done.reduce((s, r) => s + r.wrong, 0),
    totalTimeSec: Math.round(done.reduce((s, r) => s + r.timeSec, 0) * 10) / 10,
    completed: done.length
  };
}
