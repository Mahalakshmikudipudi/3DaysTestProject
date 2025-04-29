const moment = require('moment');

function generateSlots(startTime, endTime, serviceDuration, selectedDate) {
  const slots = [];

  let start = moment(startTime, "HH:mm");
  const end = moment(endTime, "HH:mm");

  const selected = moment(selectedDate, "YYYY-MM-DD");
  const today = moment().startOf('day');

  if (selected.isSame(today, 'day')) {
    const now = moment();
    if (now.isAfter(start)) {
      const nextHour = now.clone().add(1, 'hours').startOf('hour');
      if (nextHour.isBefore(end)) {
        start = nextHour;
      }
    }
  }

  while (start.clone().add(serviceDuration, 'minutes').isSameOrBefore(end)) {
    const slotStart = start.format("HH:mm");
    const slotEnd = start.clone().add(serviceDuration, 'minutes').format("HH:mm");

    slots.push({ start: slotStart, end: slotEnd });

    start.add(serviceDuration, 'minutes');
  }

  return slots;
}

module.exports = { generateSlots };
