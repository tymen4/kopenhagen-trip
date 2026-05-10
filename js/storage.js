const KEY = "kopenhagen-trip-v2";

function readState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { plan: [], done: [], skipped: [] };
    const parsed = JSON.parse(raw);
    return {
      plan: Array.isArray(parsed.plan) ? parsed.plan : [],
      done: Array.isArray(parsed.done) ? parsed.done : [],
      skipped: Array.isArray(parsed.skipped) ? parsed.skipped : [],
    };
  } catch {
    return { plan: [], done: [], skipped: [] };
  }
}

function writeState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getState() {
  return readState();
}

export function addToPlan(id) {
  const s = readState();
  if (!s.plan.includes(id)) s.plan.push(id);
  s.skipped = s.skipped.filter((x) => x !== id);
  writeState(s);
}

export function removeFromPlan(id) {
  const s = readState();
  s.plan = s.plan.filter((x) => x !== id);
  writeState(s);
}

export function skip(id) {
  const s = readState();
  if (!s.skipped.includes(id)) s.skipped.push(id);
  s.plan = s.plan.filter((x) => x !== id);
  writeState(s);
}

export function unskip(id) {
  const s = readState();
  s.skipped = s.skipped.filter((x) => x !== id);
  writeState(s);
}

export function markDone(id) {
  const s = readState();
  if (!s.done.includes(id)) s.done.push(id);
  s.plan = s.plan.filter((x) => x !== id);
  writeState(s);
}

export function resetDay() {
  const s = readState();
  s.plan = [];
  s.skipped = [];
  writeState(s);
}

export function resetAll() {
  writeState({ plan: [], done: [], skipped: [] });
}
