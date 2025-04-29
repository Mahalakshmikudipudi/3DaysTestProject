const API = `http://localhost:3000`;
const token = localStorage.getItem("token");

// helper function to format 24h time to 12h
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));

    let options = { hour: 'numeric', minute: 'numeric', hour12: true };
    return date.toLocaleTimeString([], options);
}

let selectedAppointmentId = null;

const appointmentListTable = document.getElementById("appointmentList");

document.addEventListener("DOMContentLoaded", async () => {
    await fetchAppointments();
});

async function fetchAppointments() {
    try {
        const response = await axios.get(`${API}/admin/get-appointments`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        response.data.appointments.forEach(appointment => {
            const row = document.createElement("tr");
            const timeFormatted = formatTime(appointment.time);
            let actionButtons = '';

            if (appointment.status === 'completed') {
                actionButtons = `<td>Completed</td>`;
            } else {
                actionButtons = `
            <td>
                <button class="cancel-btn" onclick="cancelAppointment(event, ${appointment.id})">Cancel</button>
            </td>`;
            }
            row.innerHTML = `
                <td>${appointment.id}</td>
                <td>${appointment.user.name}</td>
                <td>${appointment.Service.name}</td>
                <td>${appointment.Staff.staffname}</td>
                <td>${appointment.date}</td>
                <td>${timeFormatted}</td>
                ${actionButtons}
                `;
            appointmentListTable.appendChild(row);
        })

    } catch (err) {
        console.log("Error fetching appointments", err);
        alert("Failed to load appointments");
    }
};

async function cancelAppointment(e, appointmentId) {
    try {
        e.preventDefault();
        const response = await axios.delete(`${API}/admin/delete-appointment/${appointmentId}`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        if (response.data.success) {
            alert(response.data.message);
            location.reload();
        } else {
            alert(data.message || "Failed to delete staff.");
        }
    } catch (error) {
        console.error("Delete error:", error);
        alert("An error occurred while deleting the staff.");
    }
}


