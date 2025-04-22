const socket = io("http://localhost:3000", {
    auth: { token: localStorage.getItem("token") }
  });
  
  const tableBody = document.getElementById("staffAppointments");

  function convertTo12HourFormat(time24) {
    const [hour, minute] = time24.split(':');
    const hourInt = parseInt(hour);
    const period = hourInt >= 12 ? 'PM' : 'AM';
    const hour12 = hourInt % 12 === 0 ? 12 : hourInt % 12;
    return `${hour12}:${minute} ${period}`;
}
  
  socket.on("connect", () => {
    socket.emit("get-my-appointments");
  });
  
  socket.on("my-appointments-data", (appointments) => {
    tableBody.innerHTML = "";
    
    appointments.forEach(appointment => {
      const row = document.createElement("tr");
      const timeFormatted = convertTo12HourFormat(appointment.time);
      row.innerHTML = `
        <td>${appointment.id}</td>
        <td>${appointment.service.name}</td>
        <td>${appointment.date}</td>
        <td>${timeFormatted}</td>
        <td>${appointment.user.name}</td>
        <td>${appointment.isStaffAvailable ? "Available" : "Unavailable"}</td>
        <td>
          <select class="availability-select" data-staff-id="${appointment.Staff.id}">
            <option value="true" ${appointment.isStaffAvailable ? "selected" : ""}>Available</option>
            <option value="false" ${!appointment.isStaffAvailable ? "selected" : ""}>Unavailable</option>
          </select>
        </td>
        <td><button onclick="toggleAvailability(this)">Update</button></td>
      `;
      row.setAttribute("data-appointment-id", appointment.id);
      tableBody.appendChild(row);
    });
  });
  
  function toggleAvailability(buttonElement) {
    const row = buttonElement.closest("tr");
    const appointmentId = row.dataset.appointmentId;
  
    const confirmChange = confirm("Are you sure you want to mark yourself unavailable for this appointment?");
    if (confirmChange && appointmentId) {
      socket.emit("change-availability", { appointmentId });
    }
  }
  
  socket.on("availability-updated", ({ appointmentId, isAvailable }) => {
    alert("Availability updated Successfully");
    const row = document.querySelector(`tr[data-appointment-id="${appointmentId}"]`);
    if (row) {
      row.cells[5].textContent = isAvailable ? "Available" : "Unavailable";
    }
  });
  
  socket.on("new-appointment-assigned", (appointment) => {
    alert(`You have been assigned a new appointment (ID: ${appointment.id})`);
    socket.emit("get-my-appointments");
  });
  
  socket.on("error", (message) => {
    alert(message);
});
