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

document.addEventListener("DOMContentLoaded", () => {

    function convertTo12HourFormat(time24) {
        const [hour, minute] = time24.split(':');
        const hourInt = parseInt(hour);
        const period = hourInt >= 12 ? 'PM' : 'AM';
        const hour12 = hourInt % 12 === 0 ? 12 : hourInt % 12;
        return `${hour12}:${minute} ${period}`;
    }
    function fetchAppointments() {
        socket.emit('get-appointments');

        socket.once('appointments-data', (appointments) => {
            appointmentList.innerHTML = '';
            
            appointments.forEach(appointment => {
                const row = document.createElement('tr');
                const timeFormatted = convertTo12HourFormat(appointment.time);
                row.innerHTML = `
                    <td>${appointment.id}</td>
                    <td>${appointment.user.name}</td>
                    <td>${appointment.service.name}</td>
                    <td>${appointment.Staff?.staffname || 'Not Assigned'}</td>
                    <td>${appointment.date}</td>
                    <td>${timeFormatted}</td>
                    <td>
                        <select data-id="${appointment.id}" class="staff-select"></select>
                        
                    </td>
                    <td>
                        <button class="update-btn" data-id="${appointment.id}">Update</button>
                    </td>
                `;
                appointmentList.appendChild(row);

                // Load staff options for this appointment row
                fetchRowStaffOptions(appointment.service.id, appointment.id);
            });
        });
    }

    function fetchRowStaffOptions(serviceId, appointmentId) {
        socket.emit('get-staff-by-id', { serviceId, appointmentId });
    }
    
    // Now use a shared persistent listener
    socket.on('staff-list-id', ({ staffList, appointmentId }) => {
        const select = document.querySelector(`select[data-id="${appointmentId}"]`);
        if (!select) return;
    
        select.innerHTML = '<option value="">Select Staff</option>';
    
        staffList.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.id;
            option.textContent = staff.staffname;
            select.appendChild(option);
        });
    
        // Pre-select current assigned staff
        socket.emit('get-appointment-by-id', appointmentId);
    });

    socket.on('appointment-data', (appointment) => {
        const select = document.querySelector(`select[data-id="${appointment.id}"]`);
        if (select && appointment?.staffId) {
            select.value = appointment.staffId;
        }
    });
    
    

    // Listen for Update button click (event delegation)
    appointmentList.addEventListener('click', (e) => {
        if (e.target.classList.contains('update-btn')) {
            const appointmentId = e.target.dataset.id;
            const select = document.querySelector(`select[data-id="${appointmentId}"]`);
            const staffId = select.value;

            if (!staffId) {
                alert('Please select a staff to assign.');
                return;
            }

            socket.emit('update-appointment', { appointmentId, staffId });
        }
    });

    // On update success, re-fetch appointments (or update that one row)
    socket.on('appointment-updated-success', () => {
        fetchAppointments();
    });

    fetchAppointments();

    socket.on('error', (message) => {
        alert(message);
    })
});
