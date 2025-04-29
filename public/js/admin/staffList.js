const API = `http://localhost:3000`;
const token = localStorage.getItem("token");

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await axios.get(`${API}/admin/get-all-services`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        if (response.data.success) {
            const specializationSelect = document.getElementById('specialization');
            specializationSelect.innerHTML = '<option value="">-- Select Service --</option>';

            response.data.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                specializationSelect.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }
});

async function addStaff(e) {
    try {
        e.preventDefault();
        const staffDetails = {
            staffname: document.getElementById("staffName").value,
            staffemail: document.getElementById("staffEmail").value,
            staffphone: document.getElementById("staffPhone").value,
            staffpassword: document.getElementById("staffPassword").value,
            specializationId: document.getElementById("specialization").value,
            isAvailable: document.getElementById("availability").value
        };

        const response = await axios.post(`${API}/admin/add-staff`,
            staffDetails,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        if (response.data.success) {
            alert(response.data.message);
            addNewStafftoUI(response.data.staff);
        }

        document.getElementById("staffName").value = '';
        document.getElementById("staffEmail").value = '';
        document.getElementById("staffPhone").value = '';
        document.getElementById("staffPassword").value = '';
        document.getElementById("specialization").value = '';
        //Re-fetch updated expenses list (optional but recommended)
        const staffPerPage = localStorage.getItem("staffPerPage") || 5;
        await fetchStaff(1, staffPerPage);
    } catch (err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }
};

window.addEventListener("DOMContentLoaded", async () => {
    const staffPerPage = localStorage.getItem("staffPerPage") || 5; // Default to 5
    document.getElementById("itemsPerPage").value = staffPerPage; // Set dropdown value
    await fetchStaff(1, staffPerPage);
});

// Event listener for dropdown to update preference
document.getElementById("itemsPerPage").addEventListener("change", async function () {
    const selectedLimit = this.value;
    localStorage.setItem("staffPerPage", selectedLimit); // Store user preference
    await fetchStaff(1, selectedLimit); // Fetch data with new limit
});

async function fetchStaff(page, limit) {
    try {
        const response = await axios.get(`${API}/admin/get-all-staff?page=${page}&limit=${limit}`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );
        if (response.data.success) {
            response.data.staffList.forEach(staff => {
                addNewStafftoUI(staff);
                showPagination(response.data);
            })
        }

    } catch (err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }
};

// Update pagination buttons
async function showPagination({ currentPage, hasNextPage, nextPage, hasPreviousPage, previousPage, lastPage }) {
    try {
        const pagination = document.getElementById("pagination");
        pagination.innerHTML = '';

        const limit = localStorage.getItem("staffPerPage") || 5; // Get stored limit

        if (hasPreviousPage) {
            const btnPrev = document.createElement('button');
            btnPrev.innerHTML = previousPage;
            btnPrev.addEventListener('click', () => fetchStaff(previousPage, limit));
            pagination.appendChild(btnPrev);
        }

        const btnCurrent = document.createElement('button');
        btnCurrent.innerHTML = `<h3>${currentPage}</h3>`;
        btnCurrent.addEventListener('click', () => fetchStaff(currentPage, limit));
        pagination.appendChild(btnCurrent);

        if (hasNextPage) {
            const btnNext = document.createElement('button');
            btnNext.innerHTML = nextPage;
            btnNext.addEventListener('click', () => fetchStaff(nextPage, limit));
            pagination.appendChild(btnNext);
        }
    } catch (err) {
        console.log(err);
    }
};

async function addNewStafftoUI(staff) {
    const staffListBody = document.getElementById("staffList");
    const row = document.createElement('tr');
    row.classList.add('staff-row');
    row.dataset.id = staff.id;
    row.dataset.staffname = staff.staffname;
    row.dataset.staffemail = staff.staffemail;
    row.dataset.staffphone = staff.staffphone;
    row.dataset.specializationId = staff.specializationId;
    row.dataset.isAvailable = staff.isAvailable;
    row.innerHTML = `
        <td>${staff.id}</td>
        <td>${staff.staffname}</td>
        <td>${staff.staffemail}</td>
        <td>${staff.staffphone}</td>
        <td>${staff.specialization?.name || 'N/A'}</td>
        <td>${staff.isAvailable === 1 ? "Available" : "Unavailable"}</td>
        <td>
            <button class="edit-btn" onclick='editStaff(event, ${staff.id})'>Edit</button>
            <button class="delete-btn" onclick='deleteStaff(event, ${staff.id})'>Delete</button>
        </td>
        `;
    staffListBody.appendChild(row);
};

function editStaff(e, staffId) {
    e.preventDefault();
    const row = e.target.closest(".staff-row");

    if (!row) {
        console.error("Could not find the row. Is .staff-row class missing?");
        return;
    }

    document.getElementById("staffName").value = row.dataset.staffname;
    document.getElementById("staffEmail").value = row.dataset.staffemail;
    document.getElementById("staffPhone").value = row.dataset.staffphone;
    document.getElementById("specialization").value = row.dataset.specializationId;
    document.getElementById("availability").value = row.dataset.isAvailable;


    // Store the service ID in hidden input
    document.getElementById("staffId").value = staffId;

    // Toggle buttons
    document.getElementById("addBtn").style.display = 'none';
    document.getElementById("updateBtn").style.display = 'block';
}

async function updateStaff(e) {
    e.preventDefault();

    const id = document.getElementById("staffId").value;  // get ID here
    const staffname = document.getElementById("staffName").value;
    const staffemail = document.getElementById("staffEmail").value;
    const staffphone = document.getElementById("staffPhone").value;
    const specializationId = document.getElementById("specialization").value;
    const isAvailable = document.getElementById("availability").value;

    try {
        const response = await axios.put(`${API}/admin/edit-staff/${id}`, {
            staffname,
            staffemail,
            staffphone,
            specializationId,
            isAvailable
        }, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });


        if (response.data.success) {
            alert("Staff updated successfully.");
            location.reload();
        } else {
            alert(response.data.message || "Failed to update staff.");
        }
    } catch (err) {
        console.error(err);
        alert("An error occurred while updating the staff.");
    }
}

async function deleteStaff(e, staffId) {
    try {
        const response = await axios.delete(`${API}/admin/delete-staff/${staffId}`,
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
};


