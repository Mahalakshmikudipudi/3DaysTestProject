const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});

function getUserIdFromToken() {
    const token = localStorage.getItem("token"); // Retrieve stored token
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split(".")[1])); // Decode payload
        return payload.userId; // Extract userId
    } catch (error) {
        console.error("Invalid token:", error);
        return null;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById("date");
    const serviceInput = document.getElementById("service");
    const timeSelect = document.getElementById("time");
    const bookingForm = document.getElementById('bookingForm');
    const tableBody = document.getElementById('appointmentTableBody');

    // Fetch service list on focus
    serviceInput.addEventListener('focus', () => {
        socket.emit('get-services');
    });

    socket.on('service-list', services => {
        serviceInput.innerHTML = '<option value="">-- Select Service --</option>';
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = service.name;
            serviceInput.appendChild(option);
        });
    });

    // Fetch available slots when both date & service are selected
    dateInput.addEventListener('change', checkAndFetchSlots);
    serviceInput.addEventListener('change', checkAndFetchSlots);

    function checkAndFetchSlots() {
        const selectedDate = dateInput.value;
        const selectedService = serviceInput.value;

        if (selectedDate && selectedService) {
            socket.emit('get-available-slots', {
                date: selectedDate,
                serviceId: selectedService,
            });
        }
    }

    // Populate time slots
    socket.on('available-slots', slots => {
        timeSelect.innerHTML = '<option value="">-- Select Time Slot --</option>';

        if (slots.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.disabled = true;
            option.textContent = 'No slots available';
            timeSelect.appendChild(option);
            return;
        }

        slots.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
        });
    });

    
    // Add newly booked appointment to table
    socket.on('appointment-added', (appointment) => {
        addAppointmentToTable(appointment);
    });

    // Get appointments for user on page load
    const userId = getUserIdFromToken();
    socket.emit('get-user-appointments', { userId });

    socket.on('user-appointment-list', (appointments) => {
        tableBody.innerHTML = '';

        appointments.forEach(appointment => {
            addAppointmentToTable(appointment);
        });

        attachActionHandlers();
    });

    function attachActionHandlers() {
        document.querySelectorAll('.reschedule-btn').forEach(btn => {
            btn.addEventListener('click', handleReschedule);
        });
    
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', handleCancel);
        });
    
        // document.querySelectorAll('.pay-btn').forEach(btn => {
        //     btn.addEventListener('click', handlePay);
        // });
    }
    

    // Append appointment to table
    function addAppointmentToTable(appointment) {
        const existingRow = document.querySelector(`tr[data-id="${appointment.id}"]`);
        if (existingRow) {
            existingRow.remove();
        }
        const row = document.createElement('tr');
        row.setAttribute('data-id', appointment.id);
        row.innerHTML = `
            <td>${appointment.id}</td>
            <td>${appointment.user?.name || '-'}</td>
            <td>${appointment.date}</td>
            <td>${appointment.time}</td>
            <td>${appointment.service?.name || '-'}</td>
            <td>
                <button class="reschedule-btn" data-id="${appointment.id}">Reschedule</button>
            <button class="cancel-btn" data-id="${appointment.id}">Cancel</button>
            <button class="pay-btn" data-id="${appointment.id}">Pay</button>
            </td>
        `;
        tableBody.appendChild(row);
    }

    let editingAppointmentId = null; // global variable
    
    function handleReschedule(e) {
        e.preventDefault();
        const appointmentId = e.target.dataset.id;
        // Handle rescheduling logic here
        // Find row data
        const row = e.target.closest('tr');
        const serviceName = row.children[4].textContent;
        const date = row.children[2].textContent;
        const time = row.children[3].textContent;

        // Prefill form
        document.getElementById('date').value = date;
        document.getElementById('time').value = time;

        const serviceOptions = document.getElementById('service').options;
        for (let i = 0; i < serviceOptions.length; i++) {
            if (serviceOptions[i].text === serviceName) {
                serviceOptions[i].selected = true;
                break;
            }
        }

        editingAppointmentId = appointmentId;

        // Scroll to form
        document.getElementById('bookingForm').scrollIntoView({ behavior: 'smooth' });

        // Change button text
        document.getElementById('submitBtn').textContent = "Update Appointment";

    };
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
    
        const serviceId = serviceInput.value;
        const date = dateInput.value;
        const time = timeSelect.value;
    
    
        if (editingAppointmentId) {
            // Emit update
            socket.emit('reschedule-appointment', {
                appointmentId: editingAppointmentId,
                serviceId,
                date,
                time
            });
            alert("Appointment updated successfully!");
        } else {
            // Emit new booking
            socket.emit('book-appointment', {
                serviceId,
                date,
                time
            });
        }
    
    
        bookingForm.reset();
        editingAppointmentId = null;
        document.getElementById('submitBtn').textContent = "Book Appointment";
    }); 
    
    function handleCancel(e) {
        e.preventDefault();
        const appointmentId = e.target.dataset.id;
      
        const confirmCancel = confirm("Are you sure you want to cancel this appointment?");
        if (confirmCancel) {
          socket.emit('cancel-appointment', appointmentId);
        }
    }

    socket.on('appointment-cancelled', (appointmentId) => {
        const row = document.querySelector(`tr[data-id="${appointmentId}"]`);
        if (row) row.remove();
        alert("Appointment cancelled successfully!");
    });
    socket.on("appointment-cancel-failed", (message) => {
        alert(message);
    });

    function handlePay(e) {
        e.preventDefault();
        const serviceId = serviceInput.value;
        socket.emit('initiate-payment', { serviceId });
    }
    
    socket.on("payment-initiated", async ({ success, paymentSessionId, orderId, message }) => {
        if (!success) {
          return alert("Error: " + message);
        }
      
        const cashfree = Cashfree({ mode: "sandbox" });
      
        await cashfree.checkout({
          paymentSessionId,
          orderId,
          redirectTarget: "_modal"
        });
      
        socket.emit("verify-payment", { orderId });
      });
      
      socket.on("payment-checked", ({ success, paymentStatus, token, message }) => {
        if (!success) return alert("Failed: " + message);
      
        if (paymentStatus === "SUCCESS") {
          alert("🎉 Payment successful! Premium activated!");
          localStorage.setItem("token", token);
          showPremiumUserUI(); // Your custom UI update function
        } else {
          alert("Payment Status: " + paymentStatus);
        }
      
    });

    // Debugging error
    socket.on('connect_error', err => {
        console.error("Socket connection error:", err.message);
    });
});
