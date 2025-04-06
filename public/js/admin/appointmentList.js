// Connect to the server using socket.io
const socket = io("http://localhost:3000");

// DOM elements
const appointmentListContainer = document.getElementById('appointmentList');

// Fetch the appointment list when the page loads
socket.emit('fetchAppointments');

// Listen for the appointment list from the server
socket.on('appointmentList', (appointments) => {
    renderAppointments(appointments);
});

// Function to render appointments in the DOM
function renderAppointments(appointments) {
    appointmentListContainer.innerHTML = ''; // Clear the container

    appointments.forEach((appointment) => {
        const appointmentItem = document.createElement('div');
        appointmentItem.classList.add('appointment-item');
        appointmentItem.innerHTML = `
            <h3>Appointment ID: ${appointment.id}</h3>
            <p><strong>Customer:</strong> ${appointment.customerName}</p>
            <p><strong>Date:</strong> ${appointment.date}</p>
            <p><strong>Time:</strong> ${appointment.time}</p>
            <button class="edit-btn" data-id="${appointment.id}">Edit</button>
            <button class="delete-btn" data-id="${appointment.id}">Delete</button>
        `;

        // Append the appointment item to the container
        appointmentListContainer.appendChild(appointmentItem);
    });

    // Attach event listeners to Edit and Delete buttons
    document.querySelectorAll('.edit-btn').forEach((button) => {
        button.addEventListener('click', handleEdit);
    });

    document.querySelectorAll('.delete-btn').forEach((button) => {
        button.addEventListener('click', handleDelete);
    });
}

// Handle Edit button click
function handleEdit(event) {
    const appointmentId = event.target.getAttribute('data-id');
    const newDate = prompt('Enter new date (YYYY-MM-DD):');
    const newTime = prompt('Enter new time (HH:MM):');

    if (newDate && newTime) {
        socket.emit('editAppointment', { id: appointmentId, date: newDate, time: newTime });
    }
}

// Handle Delete button click
function handleDelete(event) {
    const appointmentId = event.target.getAttribute('data-id');
    const confirmDelete = confirm('Are you sure you want to delete this appointment?');

    if (confirmDelete) {
        socket.emit('deleteAppointment', { id: appointmentId });
    }
}

// Listen for updates after editing an appointment
socket.on('appointmentUpdated', (updatedAppointment) => {
    alert('Appointment updated successfully!');
    socket.emit('fetchAppointments'); // Refresh the list
});

// Listen for updates after deleting an appointment
socket.on('appointmentDeleted', (deletedAppointmentId) => {
    alert('Appointment deleted successfully!');
    socket.emit('fetchAppointments'); // Refresh the list
});