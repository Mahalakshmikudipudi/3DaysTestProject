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

function convertTo12HourFormat(time24) {
    const [hour, minute] = time24.split(':');
    const hourInt = parseInt(hour);
    const period = hourInt >= 12 ? 'PM' : 'AM';
    const hour12 = hourInt % 12 === 0 ? 12 : hourInt % 12;
    return `${hour12}:${minute} ${period}`;
}


document.addEventListener('DOMContentLoaded', () => {

    const timeInput = document.getElementById("timeInput");
    const timeOptions = document.getElementById("timeOptions");
    const serviceInput = document.getElementById('service');
    const staffInput = document.getElementById('staff');
    const tableBody = document.getElementById('appointmentTableBody');
    const dateInput = document.getElementById('date');
    const timeDropdown = document.getElementById("timeDropdown");
    const fromTimeInput = document.getElementById("fromTime");
    const toTimeInput = document.getElementById("toTime");
    const searchBtn = document.getElementById("searchSlotsBtn");

    searchBtn.addEventListener("click", () => {
        const date = document.getElementById("date").value;
        const serviceId = serviceInput.value;
        const staffId = staffInput.value;
        const fromTime = fromTimeInput.value;
        const toTime = toTimeInput.value;


        if (!date || !serviceId || !fromTime || !toTime) {
            alert("Please fill in all fields.");
            return;
        }

        // Emit socket event to fetch available slots
        socket.emit("get-available-slots", {
            serviceId,
            staffId,
            date,
            fromTime,
            toTime
        });
    });

    socket.on("availableSlotsResult", (slots) => {
        // Get selected date and today's date
        const selectedDate = document.getElementById("date").value;
        const today = new Date().toISOString().split("T")[0];
        const now = new Date();
    
        // Clear previous options
        timeDropdown.innerHTML = '<option value="">-- Select Time Slot --</option>';
    
        // Filter out past time slots if selected date is today
        const filteredSlots = slots.filter(slot => {
            if (selectedDate !== today) return true;
    
            const [hours, minutes] = slot.split(":").map(Number);
            const slotTime = new Date();
            slotTime.setHours(hours, minutes, 0, 0);
            return slotTime > now;
        });
    
        filteredSlots.forEach(slot => {
            const option = document.createElement("option");
            option.value = slot;
            option.textContent = convertTo12HourFormat(slot);
            timeDropdown.appendChild(option);
        });
    
        if (filteredSlots.length > 0) {
            const rect = timeInput.getBoundingClientRect();
            timeDropdown.style.left = `${rect.left}px`;
            timeDropdown.style.top = `${rect.bottom + window.scrollY}px`;
            timeDropdown.style.width = `${rect.width}px`;
            timeDropdown.style.display = "block";
        } else {
            timeDropdown.style.display = "none";
        }
    });
    timeDropdown.addEventListener("change", () => {
        const selectedTime = timeDropdown.value;
        if (selectedTime) {
            timeInput.value = selectedTime;
            timeDropdown.style.display = "none";
        }
    });
        


    timeInput.addEventListener("click", () => {
        timeOptions.style.display = timeOptions.style.display === "block" ? "none" : "block";
    });

    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            timeInput.style.display = 'block';
            const timeRange = btn.getAttribute('data-time');
            timeInput.value = timeRange;
            displaySlotsByRange(timeRange);
            timeOptions.style.display = 'none';
            timeDropdown.style.display = "block";
        });
    });

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

    serviceInput.addEventListener('change', () => {
        const serviceId = serviceInput.value;
        console.log("Service Id", serviceId);
        if (serviceId) {
            socket.emit('get-staff-by-service', { serviceId });
        }
        checkAndFetchSlots(); // existing logic
    });
    
    socket.on('staff-list-by-service', staffList => {
        console.log("StaffList", staffList);
        staffInput.innerHTML = '<option value="">-- Select Staff --</option>';
        staffList.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.id;
            option.textContent = staff.staffname;
            staffInput.appendChild(option);
        });
    });
    

    dateInput.addEventListener('change', checkAndFetchSlots);
    serviceInput.addEventListener('change', checkAndFetchSlots);
    staffInput.addEventListener('change', checkAndFetchSlots);


    function checkAndFetchSlots() {
        const selectedDate = dateInput.value;
        const selectedService = serviceInput.value;
        const selectedStaff = staffInput.value;
    
        const today = new Date().toISOString().split('T')[0];
        if (selectedDate < today) {
            alert("You cannot select a past date!");
            return;
        }
    
        if (selectedDate && selectedService && selectedStaff) {
            socket.emit('get-available-slots', {
                date: selectedDate,
                serviceId: selectedService,
                staffId: selectedStaff
            });
        }
    }
    


    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
    
        const serviceId = serviceInput.value;
        const date = dateInput.value;
        const time = timeDropdown.value;
        const selectedStaffId = staffInput.value || null; // optional staff
    
        if (!serviceId || !date || !time) {
            alert("Please fill in all required fields.");
            return;
        }
    
        const appointmentData = {
            serviceId,
            date,
            time,
            selectedStaffId // add staffId if selected, else null
        };
    
        if (editingAppointmentId) {
            socket.emit('reschedule-appointment', {
                ...appointmentData,
                appointmentId: editingAppointmentId
            });
            alert("Appointment updated successfully!");
        } else {
            socket.emit('book-appointment', appointmentData);
        }
    
        bookingForm.reset();
        editingAppointmentId = null;
        document.getElementById('submitBtn').textContent = "Book Appointment";
    });
    


    // Add newly booked appointment to table
    socket.on('appointment-added', (data) => {
        if (data && data.appointmentId) {
            localStorage.setItem('appointmentId', data.appointmentId);
            console.log("AppointmentId", data.appointmentId);
            console.log("ServiceId", data.serviceId);
            initiatePayment(data.appointmentId, data.serviceId);

        }
        localStorage.setItem('staffId', data.staffId);
        addAppointmentToTable(data);
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

    }


    // Append appointment to table
    function addAppointmentToTable(appointment) {
        const existingRow = document.querySelector(`tr[data-id="${appointment.id}"]`);
        if (existingRow) {
            existingRow.remove();
        }
        const row = document.createElement('tr');
        row.setAttribute('data-id', appointment.id);
        row.setAttribute('data-service-id', appointment.service?.id);
        const isCompleted = appointment.status?.toLowerCase() === 'completed';
        const timeFormatted = convertTo12HourFormat(appointment.time);
        row.innerHTML = `
            <td>${appointment.id}</td>
            <td>${appointment.user?.name || '-'}</td>
            <td>${appointment.date}</td>
            <td>${timeFormatted} </td>
            <td>${appointment.Staff.staffname}</td>
            <td>${appointment.service?.name || '-'}</td>
            <td>
                ${isCompleted ? 'Completed' : `
                <button class="reschedule-btn" data-id="${appointment.id}">Reschedule</button>
                <button class="cancel-btn" data-id="${appointment.id}">Cancel</button>
            `}
            </td>
            `;
        tableBody.appendChild(row);
    }

    let editingAppointmentId = null; // global variable

    function handleReschedule(e) {
        e.preventDefault();
        const appointmentId = e.target.dataset.id;
    
        const row = e.target.closest('tr');
        const date = row.children[2].textContent;
        const time = row.children[3].textContent;
        const serviceName = row.children[4].textContent;
        const staffName = row.children[5]?.textContent; // assuming staff name is in 6th column
    
        // Prefill form
        document.getElementById('date').value = date;
        document.getElementById('timeInput').value = time;
    
        const serviceOptions = document.getElementById('service').options;
        for (let i = 0; i < serviceOptions.length; i++) {
            if (serviceOptions[i].text === serviceName) {
                serviceOptions[i].selected = true;
                break;
            }
        }
    
        const staffOptions = document.getElementById('staff').options;
        if (staffName && staffName !== "Not assigned") {
            for (let i = 0; i < staffOptions.length; i++) {
                if (staffOptions[i].text === staffName) {
                    staffOptions[i].selected = true;
                    break;
                }
            }
        } else {
            document.getElementById('staff').selectedIndex = 0; // Default to "-- Select Staff --"
        }
    
        editingAppointmentId = appointmentId;
    
        document.getElementById('bookingForm').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('submitBtn').textContent = "Update Appointment";
    }
    

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

    function initiatePayment(appointmentId, serviceId) {
        const cashfree = Cashfree({ mode: "sandbox" });

        // Check if payment already done
        socket.emit("check-appointment-payment", { appointmentId });

        socket.once("appointment-payment-status", ({ isPaid }) => {
            if (isPaid) {
                alert("Payment already completed for this appointment.");
                return;
            }

            socket.emit("initiate-payment", { appointmentId, serviceId });

            socket.once("payment-initiated", async ({ paymentSessionId, orderId }) => {
                try {
                    const checkoutOptions = {
                        paymentSessionId,
                        orderId,
                        redirectTarget: "_modal"
                    };

                    await cashfree.checkout(checkoutOptions);

                    // Wait for a few seconds to ensure payment propagation
                    setTimeout(() => {
                        socket.emit("update-transaction", { orderId, paymentSessionId });
                    }, 5000);

                } catch (err) {
                    console.error("Cashfree checkout error:", err);
                    alert("Payment failed to start.");
                }
            });

            socket.once("transaction-updated", () => {
                alert("Payment Successful!");
                window.location.href = "/html/customers/bookingAppointment.html";
                alert('Appointment booked!');
            });

            socket.once("transaction-update-failed", (data) => {
                alert("Payment incomplete: " + data.message);
            });
        });
    }


    socket.on("payment-error", ({ message }) => {
        alert(`Payment Error: ${message}`);
    });



    // Debugging error
    socket.on('connect_error', err => {
        console.error("Socket connection error:", err.message);
    });
});
