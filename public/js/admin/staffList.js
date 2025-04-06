const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});

// Fetch available services to populate the specialization dropdown
function fetchServices() {
    socket.emit('get-services');
}

// Handle the list of services
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

// Add new staff
function addStaff() {
    const staffname = document.getElementById('staffName').value.trim();
    const staffemail = document.getElementById('staffEmail').value.trim();
    const staffphone = document.getElementById('staffPhone').value.trim();
    const specializationId = document.getElementById('specialization').value;

    if (!staffname || !staffemail || !staffphone || !specializationId) {
        alert("Please fill in all fields.");
        return;
    }

    const staffData = { staffname, staffemail, staffphone, specializationId };
    socket.emit('add-staff', staffData);
    socket.emit('get-staff'); // Refresh staff list

    // Optionally clear input fields
    document.getElementById('staffName').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('staffPhone').value = '';
    document.getElementById('specialization').value = '';
}

// Append a staff row to the table
function appendStaffRow(staff) {
    const staffTableBody = document.getElementById('staffList');
    const row = document.createElement('tr');
    row.id = `staff-${staff.id}`; // Assign row ID for later updates
    row.innerHTML = `
        <td>${staff.id}</td>
        <td>${staff.staffname}</td>
        <td>${staff.staffemail}</td>
        <td>${staff.staffphone}</td>
        <td>${staff.specialization?.name || 'N/A'}</td>
        <td>
            <button onclick="editStaff(${staff.id})">Edit</button>
            <button onclick="deleteStaff(${staff.id})">Delete</button>
        </td>
    `;
    staffTableBody.appendChild(row);
}

// 🔥 On page load, fetch staff
window.addEventListener('DOMContentLoaded', () => {
    fetchServices();         // Also populate services dropdown
    socket.emit('get-staff');
});

// 🔥 Handle full staff list
socket.on('staff-list', (staffMembers) => {
    const staffTableBody = document.getElementById('staffList');
    staffTableBody.innerHTML = '';
    staffMembers.forEach(appendStaffRow);
});

// 🔥 Handle single added staff
socket.on('staff-added', (staff) => {
    // Fetch full staff list again (optional), or just append:
    appendStaffRow(staff);
});

function editStaff(id) {
    const row = document.getElementById(`staff-${id}`);
    const cells = row.getElementsByTagName('td');

    const [idCell, nameCell, emailCell, phoneCell, specializationCell] = cells;

    const name = nameCell.textContent;
    const email = emailCell.textContent;
    const phone = phoneCell.textContent;
    const specializationName = specializationCell.textContent;

    document.getElementById('staffName').value = name;
    document.getElementById('staffEmail').value = email;
    document.getElementById('staffPhone').value = phone;

    // Try to match dropdown option
    const select = document.getElementById('specialization');
    for (let option of select.options) {
        if (option.text === specializationName) {
            select.value = option.value;
            break;
        }
    }

    // Change Add button to Update
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = 'Update';
    submitBtn.onclick = () => updateStaff(id);
}

function updateStaff(id) {
    const staffname = document.getElementById('staffName').value.trim();
    const staffemail = document.getElementById('staffEmail').value.trim();
    const staffphone = document.getElementById('staffPhone').value.trim();
    const specializationId = document.getElementById('specialization').value;

    if (!staffname || !staffemail || !staffphone || !specializationId) {
        alert("Please fill in all fields.");
        return;
    }

    socket.emit('edit-staff', { id, staffname, staffemail, staffphone, specializationId });

    // Reset form
    document.getElementById('staffName').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('staffPhone').value = '';
    document.getElementById('specialization').value = '';
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = 'Add Staff';
    submitBtn.onclick = addStaff;
}

socket.on('staff-updated', (staff) => {
    const oldRow = document.getElementById(`staff-${staff.id}`);
    if (oldRow) oldRow.remove(); // remove old
    appendStaffRow(staff);       // append updated
});

function deleteStaff(id) {
    if (confirm("Are you sure you want to delete this staff member?")) {
        socket.emit('delete-staff', id);
    }
}

// Listen to deletion confirmation from server
socket.on('staff-deleted', (id) => {
    const row = document.getElementById(`staff-${id}`);
    if (row) row.remove();
});



// 🔥 Show errors
socket.on('error', (message) => {
    alert(message);
});
