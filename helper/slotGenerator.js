function generateSlots(from, to, duration, staffStart, staffEnd) {
  console.log(from, to, duration, staffEnd, staffStart);
  const slots = [];
  let current = toMinutes(from);
  const toLimit = toMinutes(to);
  const staffStartMin = toMinutes(staffStart);
  const staffEndMin = toMinutes(staffEnd);

  while (current + duration <= toLimit) {
      if (current >= staffStartMin && current + duration <= staffEndMin) {
          const startSlot = toHHMM(current);
          const endSlot = toHHMM(current + duration);
          slots.push(`${startSlot}`);
      }
      current += duration;
  }
  //console.log("Slots is", slots);
  return slots;
}

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

module.exports = { generateSlots }
  