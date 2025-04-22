const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});

function formatTo12Hour(time24) {
    const [hour, minute] = time24.split(':');
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
}


let currentPage = 1;
const staffPerPage = 5;
let allStaff = [];


// Fetch available services to populate the specialization dropdown
function fetchServices() {
    socket.emit('get-services');
}

// Populate specialization dropdown when receiving services
socket.on('service-list', (services) => {
    const specializationSelect = document.getElementById('specialization');
    specializationSelect.innerHTML = '<option value="">-- Select Service --</option>';

    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = service.name;
        specializationSelect.appendChild(option);
    });
});

document.querySelector("form").addEventListener("submit", addStaff);


// Add staff member
function addStaff(e) {
    e.preventDefault();

    const staffname = document.getElementById('staffName').value.trim();
    const staffemail = document.getElementById('staffEmail').value.trim();
    const staffphone = document.getElementById('staffPhone').value.trim();
    const staffpassword = document.getElementById('staffPassword').value.trim();
    const specializationId = document.getElementById('specialization').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    const isAvailable = parseInt(document.getElementById('availability').value);

    if (!staffname || !staffemail || !staffphone || !staffpassword || !specializationId || !startTime || !endTime || !isAvailable) {
        alert("Please fill in all fields.");
        return;
    }

    const staffData = {
        staffname,
        staffemail,
        staffphone,
        staffpassword,
        specializationId,
        startTime,
        endTime,
        isAvailable
    };

    console.log(staffData);

    socket.emit('add-staff', staffData);
    socket.emit('get-staff', { page: currentPage, limit: staffPerPage }); // Refresh list

    document.querySelector('form').reset();
}

socket.on('staff-added', () => {
    getStaffList(currentPage);
});

// Render one staff row
function appendStaffRow(staff) {
    const staffTableBody = document.getElementById('staffList');
    const row = document.createElement('tr');
    row.id = `staff-${staff.id}`;

    row.innerHTML = `
        <td>${staff.id}</td>
        <td>${staff.staffname}</td>
        <td>${staff.staffemail}</td>
        <td>${staff.staffphone}</td>
        <td>${staff.specialization?.name || 'N/A'}</td>
        <td>${formatTo12Hour(staff.startTime) || '-'}</td>
        <td>${formatTo12Hour(staff.endTime) || '-'}</td>
        <td>${staff.isAvailable ? 'Available' : 'Unavailable'}</td>
        <td>
            <button class="edit-btn" onclick="editStaff(${staff.id})">Edit</button>
            <button class="delete-btn" onclick="deleteStaff(${staff.id})">Delete</button>
        </td>
    `;

    staffTableBody.appendChild(row);
}


// Populate staff list
socket.on('staff-list', (data) => {
    const { staffMembers, total, page, totalPages } = data;
    currentPage = page;
    totalPagesGlobal = totalPages;

    const tbody = document.getElementById('staffList');
    tbody.innerHTML = '';

    if (staffMembers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="9">No staff to display.</td>`;
        tbody.appendChild(row);
        return;
    }

    staffMembers.forEach(appendStaffRow);
    document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages}`;
});


document.addEventListener('DOMContentLoaded', () => {
    fetchServices();
    getStaffList(currentPage);
    
    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            getStaffList(currentPage);
        }
    });

    document.getElementById("nextPage").addEventListener("click", () => {
        const maxPages = totalPagesGlobal; // Use the correct total pages received from backend
        if (currentPage < maxPages) {
            currentPage++;
            getStaffList(currentPage);
        }
    });
});

function getStaffList(page) {
    socket.emit('get-staff', { page: page, limit: staffPerPage });
}



function editStaff(id) {
    const row = document.getElementById(`staff-${id}`);
    const cells = row.getElementsByTagName('td');

    document.getElementById('staffName').value = cells[1].textContent;
    document.getElementById('staffEmail').value = cells[2].textContent;
    document.getElementById('staffPhone').value = cells[3].textContent;
    document.getElementById('availability').value = (cells[7].textContent === 'Available') ? 1 : 0;

    // Set times
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;


    // Match service dropdown by text
    const specDropdown = document.getElementById('specialization');
    [...specDropdown.options].forEach(opt => {
        if (opt.text === cells[4].textContent) {
            specDropdown.value = opt.value;
        }
    });

    // Change button behavior
    const btn = document.getElementById('submitBtn');
    btn.textContent = 'Update';
    btn.onclick = (e) => updateStaff(e, id);
}

function updateStaff(e, id) {
    e.preventDefault();

    const staffname = document.getElementById('staffName').value.trim();
    const staffemail = document.getElementById('staffEmail').value.trim();
    const staffphone = document.getElementById('staffPhone').value.trim();
    const specializationId = document.getElementById('specialization').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    const isAvailable = parseInt(document.getElementById('availability').value);

    if (!staffname || !staffemail || !staffphone || !specializationId || !startTime || !endTime) {
        alert("Please fill in all fields.");
        return;
    }

    const data = {
        id,
        staffname,
        staffemail,
        staffphone,
        specializationId,
        startTime,
        endTime,
        isAvailable
    };

    socket.emit('edit-staff', data);

    document.querySelector('form').reset();

    const btn = document.getElementById('submitBtn');
    btn.textContent = 'Add Staff';
    btn.onclick = addStaff;
}

socket.on('staff-updated', () => {
    getStaffList(currentPage);
});


function deleteStaff(id) {
    if (confirm("Delete this staff member?")) {
        socket.emit('delete-staff', id);
    }
}

socket.on('staff-deleted', () => {
    getStaffList(currentPage);
});


socket.on('error', (msg) => {
    alert(msg);
});
