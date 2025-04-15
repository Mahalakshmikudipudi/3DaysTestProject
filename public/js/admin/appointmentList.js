const socket = io("http://localhost:3000", {
    auth: { token: localStorage.getItem("token") } //  Send token
});

let selectedAppointmentId = null; // Variable to store the selected appointment ID

const appointmentList = document.getElementById('appointmentList');
const assignStaffSelect = document.getElementById('assignStaffSelect');
const serviceNameInput = document.getElementById('serviceName');
const staffNameInput = document.getElementById('staffName');
const dateInput = document.getElementById('appointmentDate');
const timeInput = document.getElementById('appointmentTime');

// Edit appointment (fetch by id)
function editAppointment(id) {
    socket.emit('get-appointment-by-id', id);

    socket.once('appointment-data', (appointment) => {
        if (!appointment) {
            return alert('Appointment not found');
        }

        //console.log("Editing appointment:", appointment);

        selectedAppointmentId = appointment.id;

        // If backend sends nested objects, use those
        serviceNameInput.value = appointment.service?.name || appointment.serviceName || '';
        staffNameInput.value = appointment.Staff?.staffname || appointment.staffName || '';
        dateInput.value = appointment.date;
        timeInput.value = appointment.time;

        
        //console.log("Service ID:", appointment.service?.id || appointment.serviceId || '');

        fetchStaffOptions(appointment.serviceId);

    });
}

// Fetch staff using socket
function fetchStaffOptions(serviceId) {
    socket.emit('get-staff-by-id', {serviceId});

    socket.once('staff-list-id', (staffList) => {
        assignStaffSelect.innerHTML = '<option value="">Select Staff</option>';
        staffList.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.id;
            option.textContent = staff.staffname;
            assignStaffSelect.appendChild(option);
        });
    });
}


document.addEventListener("DOMContentLoaded", () => {

    // Fetch and render appointments using socket
    function fetchAppointments() {
        socket.emit('get-appointments');

        socket.once('appointments-data', (appointments) => {
            appointmentList.innerHTML = '';
            appointments.forEach(appointment => {
                const row = document.createElement('tr');
                row.innerHTML = `
                <td>${appointment.id}</td>
                <td>${appointment.user.name}</td>
                <td>${appointment.service.name}</td>
                <td>${appointment.Staff.staffname || 'Not Assigned'}</td>
                <td>${appointment.date}</td>
                <td>${appointment.time}</td>
                <td>
                    <button class="edit-btn" onclick="editAppointment(${appointment.id})" id="editBtn">Edit</button>
                </td>
            `;
                appointmentList.appendChild(row);
            });
        });
    }

    

    document.getElementById('updateBtn').addEventListener('click', () => {
        updateAppointment();
    });

    

    // Update appointment with new staff
    function updateAppointment() {
        const staffId = assignStaffSelect.value;
        if (!selectedAppointmentId || !staffId) {
            return alert('Please select a staff to assign.');
        }

        socket.emit('update-appointment', {
            appointmentId: selectedAppointmentId,
            staffId
        });
    }

    // Listen for confirmation and updates
    socket.on('appointment-updated-success', (updatedAppointment) => {
        alert('Appointment updated!');
        fetchAppointments();
    });

    socket.on('appointment-updated', (updated) => {
        console.log('Real-time update from others:', updated);
        fetchAppointments();
    });

    // Initial fetch
    fetchAppointments();

    socket.on('edit-not-allowed', (msg) => {
        alert(msg);
      });

});