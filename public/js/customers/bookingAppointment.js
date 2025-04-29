const API = `http://localhost:3000`;
const token = localStorage.getItem("token");

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

window.onload = function () {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0]; // Get today's date in yyyy-mm-dd format
    dateInput.setAttribute('min', today); // Set it as min
};

// helper function to format 24h time to 12h
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));

    let options = { hour: 'numeric', minute: 'numeric', hour12: true };
    return date.toLocaleTimeString([], options);
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await axios.get(`${API}/admin/get-all-services`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        if (response.data.success) {
            const serviceSelect = document.getElementById('service');
            serviceSelect.innerHTML = '<option value="">-- Select Service --</option>';

            response.data.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                serviceSelect.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }

});



async function fetchSlots(e) {
    const date = document.getElementById("date").value;
    const serviceId = document.getElementById("service").value;
    try {
        e.preventDefault();
        const response = await axios.get(`${API}/customer/get-available-slots`, {
            params: { date, serviceId },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        document.getElementById("bookingForm").style.display = 'none';
        document.getElementById("search-container").style.display = 'block';
        const slots = response.data.formattedSlots;
        console.log(response.data.formattedSlots);
        const slotContainer = document.getElementById('slotContainer');
        slotContainer.innerHTML = '';
        const today = new Date().toISOString().split('T')[0]; // today's date yyyy-mm-dd
        let filteredSlots = slots;

        if (date === today) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes(); // current time in total minutes

            filteredSlots = slots.filter(slot => {
                const [startHours, startMinutes] = slot.startTime.split(":").map(Number);
                const slotMinutes = startHours * 60 + startMinutes;
                return slotMinutes > currentMinutes; // keep only slots after now
            });
        }

        if (filteredSlots.length === 0) {
            slotContainer.innerHTML = '<p>No upcoming slots available today.</p>';
        } else {
            filteredSlots.forEach(slot => {
                displaySlots(slot);
            });
        }



    } catch (err) {
        console.error("Error fetching slots:", err);
    }
};

function displaySlots(slot) {
    const slotContainer = document.getElementById('slotContainer');

    const btn = document.createElement('button');

    const startFormatted = formatTime(slot.startTime);
    const endFormatted = formatTime(slot.endTime);

    // Set button class based on isDisabled
    btn.className = 'slot-button ' + (slot.isDisabled ? 'disabled' : 'enabled');

    btn.innerText = `${startFormatted} - ${endFormatted}\nStaff: ${slot.staffName}`;

    // Correctly disable button if slot is disabled
    btn.disabled = slot.isDisabled; 

    slotContainer.appendChild(btn);

    // Only allow onclick if the button is not disabled
    if (!slot.isDisabled) {
        btn.onclick = () => {
            selectedNewSlot = {
                startTime: slot.startTime,
                endTime: slot.endTime,
                staffName: slot.staffName,
                staffId: slot.staffId,
                serviceId: slot.serviceId,
                serviceName: slot.serviceName,
                servicePrice: slot.servicePrice,
                date: slot.date,
                slotId: slot.slotId
            };
    
            openPopup(selectedNewSlot);
        };
    }
    
}


document.getElementById("search").addEventListener('click', async () => {
    document.getElementById("timeInput").style.display = 'block';
})

async function searchSlots(e) {
    try {
        e.preventDefault();
        const date = document.getElementById("date").value;
        const serviceId = document.getElementById("service").value;
        const fromTime = document.getElementById("fromTimeInput").value;
        const toTime = document.getElementById("toTimeInput").value;

        const response = await axios.get(`${API}/customer/search-slots`, {
            params: { date, serviceId, fromTime, toTime },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success) {
            const slotContainer = document.getElementById('slotContainer');
            slotContainer.innerHTML = ''; // Clear old slots first

            response.data.slots.forEach(slot => {
                displaySlots(slot);
            });
        }

    } catch (err) {
        console.log("Error searching slots:", err);

    }
}

const popupModal = document.getElementById('popupModal');
const closeModal = document.getElementById('closeModal');
const serviceNameElem = document.getElementById('serviceName');
const servicePriceElem = document.getElementById('servicePrice');
const staffNameElem = document.getElementById('staffName');
const slotTimeElem = document.getElementById('slotTime');
const bookPayBtn = document.getElementById('bookPayBtn');

// Close modal
closeModal.onclick = function () {
    popupModal.style.display = "none";
};
window.onclick = function (event) {
    if (event.target === popupModal) {
        popupModal.style.display = "none";
    }
};

// Open modal with slot data
function openPopup(slotData) {
    const startFormatted = formatTime(slotData.startTime);
    serviceNameElem.innerText = `Service Name: ${slotData.serviceName}`;
    servicePriceElem.innerText = `Service Price: ₹${slotData.servicePrice}`;
    staffNameElem.innerText = `Staff Name: ${slotData.staffName}`;
    slotTimeElem.innerText = `Slot Time: ${startFormatted}`;



    // Pass slotData to bookAndPay when the button is clicked
    bookPayBtn.onclick = async function () {
        bookAndPay(slotData);
    };

    popupModal.style.display = "flex";
}

const cashfree = Cashfree({
    mode: "sandbox",
});


// Handle Book and Pay
async function bookAndPay(slotData) {
    try {
        const serviceId = slotData.serviceId;
        const time = slotData.startTime;
        const date = slotData.date;
        const staffId = slotData.staffId;
        const slotId = slotData.slotId;
        const response = await fetch(`${API}/customer/book-and-pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Send token for authentication
            },
            body: JSON.stringify({
                serviceId: serviceId,
                time,
                date,
                staffId,
                slotId
            })
        });
        const data = await response.json();
        console.log(data);
        const paymentSessionId = data.paymentSessionId;
        const orderId = data.orderId; // Ensure backend sends orderId

        //console.log("paymentId:", orderId);

        let checkoutOptions = {
            paymentSessionId: paymentSessionId,
            orderId: orderId,
            redirectTarget: "_modal",

        };

        // Start the checkout process
        await cashfree.checkout(checkoutOptions);
        updateTransactionStatus(paymentSessionId, orderId);
        const newAppointment = data.appointment;
        addNewAppointmentToUI(newAppointment);
        const appointmentsPerPage = localStorage.getItem("appointmentsPerPage") || 5;
        await getAppointmentsById(1, appointmentsPerPage);
    } catch (error) {
        console.error("Error initiating payment:", error.message);
        alert("Payment initiation failed. Please try again.");
    }
};

async function updateTransactionStatus(paymentSessionId, orderId) {
    try {
        const response = await fetch(`${API}/customer/update-transaction`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Send token for authentication
            },
            body: JSON.stringify({
                orderId: orderId,
                paymentSessionId: paymentSessionId
            })
        });

        const data = await response.json();
        if (data.success) {
            alert("Transaction Updated Successfully!");
            alert("Appointment booked successfully");
            window.location.href = "/public/html/customers/bookingAppointment.html";


        } else {
            alert("Transaction update failed: " + data.message);
        }
    } catch (error) {
        console.error("Error updating transaction:", error);
    }
};

function addNewAppointmentToUI(appointment) {
    const appointmentTableBody = document.getElementById("appointmentTableBody");

    const row = document.createElement('tr');
    row.classList.add('appointment-row');
    row.dataset.id = appointment.id;
    row.dataset.date = appointment.date;
    row.dataset.serviceName = appointment.Service.name;
    row.dataset.staffName = appointment.Staff.staffname; 
    const timeFormatted = formatTime(appointment.time);
    let actionButtons = '';

    if (appointment.status === 'completed') {
        actionButtons = `<td>Completed</td>`;
    } else {
        actionButtons = `
            <td>
                <button class="reschedule-btn" onclick="rescheduleAppointment(event, ${appointment.id})">Reschedule</button>
                <button class="cancel-btn" onclick="cancelAppointment(event, ${appointment.id})">Cancel</button>
            </td>`;
    }
    row.innerHTML = `
        <td>${appointment.id}</td>
        <td>${appointment.user.name}</td>
        <td>${appointment.date}</td>
        <td>${timeFormatted }</td>
        <td>${appointment.Service.name}</td>
        <td>${appointment.Staff.staffname}</td>
        ${actionButtons}
        `;
    appointmentTableBody.appendChild(row);
};

window.addEventListener("DOMContentLoaded", async () => {
    const appointmentsPerPage = localStorage.getItem("appointmentsPerPage") || 5; // Default to 5
    document.getElementById("itemsPerPage").value = appointmentsPerPage; // Set dropdown value
    await getAppointmentsById(1, appointmentsPerPage);
});

// Event listener for dropdown to update preference
document.getElementById("itemsPerPage").addEventListener("change", async function () {
    const selectedLimit = this.value;
    localStorage.setItem("appointmentsPerPage", selectedLimit); // Store user preference
    await getAppointmentsById(1, selectedLimit); // Fetch data with new limit
});

async function getAppointmentsById(page, limit) {
    try {
        const response = await axios.get(`${API}/customer/get-appointment-by-id?page=${page}&limit=${limit}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        let appointments = response.data.appointments;
        appointments = Array.isArray(appointments) ? appointments : [appointments]; // Always make it an array

        console.log(appointments);
        appointments.forEach(appointment => {
            addNewAppointmentToUI(appointment);
        });
        showPagination(response.data);
    } catch (err) {
        console.log("Error getting appointments", err);
        alert("Getting appointments failed");
    }
};

// Update pagination buttons
async function showPagination({ currentPage, hasNextPage, nextPage, hasPreviousPage, previousPage, lastPage }) {
    try {
        const pagination = document.getElementById("pagination");
        pagination.innerHTML = '';

        const limit = localStorage.getItem("appointmentsPerPage") || 5; // Get stored limit

        if (hasPreviousPage) {
            const btnPrev = document.createElement('button');
            btnPrev.innerHTML = previousPage;
            btnPrev.addEventListener('click', () => getAppointmentsById(previousPage, limit));
            pagination.appendChild(btnPrev);
        }

        const btnCurrent = document.createElement('button');
        btnCurrent.innerHTML = `<h3>${currentPage}</h3>`;
        btnCurrent.addEventListener('click', () => getAppointmentsById(currentPage, limit));
        pagination.appendChild(btnCurrent);

        if (hasNextPage) {
            const btnNext = document.createElement('button');
            btnNext.innerHTML = nextPage;
            btnNext.addEventListener('click', () => getAppointmentsById(nextPage, limit));
            pagination.appendChild(btnNext);
        }
    } catch (err) {
        console.log(err);
    }
};

let rescheduleInfo = null;

function rescheduleAppointment(e, appointmentId) {
    e.preventDefault();
    const row = e.target.closest(".appointment-row");

    if (!row) {
        console.error("Could not find the row. Is .appointment-row class missing?");
        return;
    }

    // Store info needed for updating
    rescheduleInfo = {
        appointmentId,
        date: row.dataset.date,
        serviceName: row.dataset.serviceName,
        staffName: row.dataset.staffName
    };

    // Pre-fill date and service
    document.getElementById("date").value = row.dataset.date;

    const serviceSelect = document.getElementById("service");
    const options = Array.from(serviceSelect.options);
    const matchedOption = options.find(opt => opt.textContent === row.dataset.serviceName);
    if (matchedOption) {
        matchedOption.selected = true;
    }

    // Show search slots section
    document.getElementById("bookingForm").style.display = 'block';
    document.getElementById("search-container").style.display = 'none';
    document.getElementById("slotContainer").innerHTML = '';

    // Change button visibility
    document.getElementById("bookPayBtn").style.display = 'none';
    document.getElementById("update-btn").style.display = 'block';

    // Fetch new slots for selected date and service
    fetchSlots(e);
}


document.getElementById("update-btn").addEventListener("click", async () => {
    if (!rescheduleInfo || !selectedNewSlot) {
        alert("Please select a new slot to reschedule.");
        return;
    }

    try {
        const response = await axios.put(`${API}/customer/reschedule-appointment/${rescheduleInfo.appointmentId}`, {
            newDate: selectedNewSlot.date,
            newTime: selectedNewSlot.startTime,
            newStaffId: selectedNewSlot.staffId,
            newSlotId: selectedNewSlot.slotId
        }, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.data.success) {
            alert("Appointment rescheduled successfully!");
            location.reload();
        } else {
            alert("Rescheduling failed: " + response.data.message);
        }
    } catch (error) {
        console.error("Error rescheduling:", error);
        alert("Rescheduling error occurred.");
    }
});


async function cancelAppointment(e, appointmentId) {
    try {
        const response = await axios.delete(`${API}/customer/delete-appointment/${appointmentId}`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        if (response.data.success) {
            alert(response.data.message);
            location.reload();
            updateAppointmentStatusInUI(appointmentId, response.data.appointment);
        } else {
            alert(data.message || "Failed to delete staff.");
        }
    } catch (error) {
        console.error("Delete error:", error);
        alert("An error occurred while deleting the staff.");
    }
};

function updateAppointmentStatusInUI(appointmentId, newStatus) {
    const row = document.querySelector(`[data-id='${appointmentId}']`).closest('tr');
    row.cells[6].innerText = newStatus; // Update the status column with 'Canceled'
}









