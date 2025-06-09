const API = `http://localhost:3000`;
const token = localStorage.getItem("token");

const tableBody = document.getElementById("staffAppointments");


window.addEventListener("DOMContentLoaded", async () => {
  const appointmentsPerPage = localStorage.getItem("appoinmentsPerPage") || 5; // Default to 5
  document.getElementById("itemsPerPage").value = appointmentsPerPage; // Set dropdown value
  await fetchMyAppointments(1, appointmentsPerPage);
});

// Event listener for dropdown to update preference
document.getElementById("itemsPerPage").addEventListener("change", async function () {
  const selectedLimit = this.value;
  localStorage.setItem("expensesPerPage", selectedLimit); // Store user preference
  await fetchExpenses(1, selectedLimit); // Fetch data with new limit
});

async function fetchMyAppointments(page, limit) {
  try {
    const res = await fetch(`${API}/staff/appointments?page=${page}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    const fetchedAppointments = Array.isArray(data.appointments) ? data.appointments : [];
    showPagination(data);

    tableBody.innerHTML = "";

    fetchedAppointments.forEach(appointment => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${appointment.id}</td>
        <td>${appointment.Service.name}</td>
        <td>${appointment.date}</td>
        <td>${appointment.time}</td>
        <td>${appointment.user.name}</td>
        <td>${appointment.isStaffAvailable ? "Available" : "Unavailable"}</td>
        <td>
          <select class="availability-select" data-staff-id="${appointment.Staff.id}">
            <option value="true" ${appointment.isStaffAvailable ? "selected" : ""}>Available</option>
            <option value="false" ${!appointment.isStaffAvailable ? "selected" : ""}>Unavailable</option>
          </select>
        </td>
        <td><button class="update-btn" data-id="${appointment.id}">Update</button></td>
      `;
      row.setAttribute("data-appointment-id", appointment.id);
      tableBody.appendChild(row);

      
    });

  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    alert("Error fetching appointments.");
  }
}

// Delegate event listener to handle clicks on update buttons
tableBody.addEventListener("click", async (event) => {
  if (event.target.classList.contains("update-btn")) {
    const row = event.target.closest("tr");
    const appointmentId = row.dataset.appointmentId;

    const confirmChange = confirm("Are you sure you want to change availability for this appointment?");
    if (!confirmChange || !appointmentId) return;

    try {
      const res = await fetch(`${API}/staff/availability/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        alert("Availability updated successfully");
        // Update status in DOM
        const statusCell = row.cells[5];
        statusCell.textContent = data.isAvailable ? "Available" : "Unavailable";
      } else {
        alert("Failed to update availability");
      }
    } catch (error) {
      console.error("Error updating availability:", error);
      alert("Error updating availability.");
    }
  }
});

// Update pagination buttons
async function showPagination({ currentPage, hasNextPage, nextPage, hasPreviousPage, previousPage, lastPage }) {
  try {
      const pagination = document.getElementById("pagination");
      pagination.innerHTML = '';

      const limit = localStorage.getItem("appointmentsPerPage") || 5; // Get stored limit

      if (hasPreviousPage) {
          const btnPrev = document.createElement('button');
          btnPrev.innerHTML = previousPage;
          btnPrev.addEventListener('click', () => fetchMyAppointments(previousPage, limit));
          pagination.appendChild(btnPrev);
      }

      const btnCurrent = document.createElement('button');
      btnCurrent.innerHTML = `<h3>${currentPage}</h3>`;
      btnCurrent.addEventListener('click', () => fetchMyAppointments(currentPage, limit));
      pagination.appendChild(btnCurrent);

      if (hasNextPage) {
          const btnNext = document.createElement('button');
          btnNext.innerHTML = nextPage;
          btnNext.addEventListener('click', () => fetchMyAppointments(nextPage, limit));
          pagination.appendChild(btnNext);
      }
  } catch (err) {
      console.log(err);
  }
}

