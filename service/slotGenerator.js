exports.generateSlots = (workingHours, serviceDuration, bookedTimes) => {
    const slots = [];
  
    if (!workingHours || !workingHours.startTime || !workingHours.endTime) return slots;
  
    let start = new Date(`1970-01-01T${workingHours.startTime}:00`);
    const end = new Date(`1970-01-01T${workingHours.endTime}:00`);
    const durMs = serviceDuration * 60000; // convert minutes to ms
  
    while (start.getTime() + durMs <= end.getTime()) {
      const timeStr = start.toTimeString().slice(0, 5); // 'HH:MM'
      if (!bookedTimes.includes(timeStr)) slots.push(timeStr);
      start = new Date(start.getTime() + durMs);
    }
  
    return slots;
  };
  