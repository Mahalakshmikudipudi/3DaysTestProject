const socket = io("http://localhost:3000", {
    auth: { token: localStorage.getItem("token") } //  Send token
});
const serviceTableBody = document.getElementById('serviceList');

const serviceName = document.getElementById('serviceName');
const serviceDescription = document.getElementById('serviceDescription');
const serviceDuration = document.getElementById('serviceDuration');
const servicePrice = document.getElementById('servicePrice');
const serviceAvailability = document.getElementById('serviceAvailability');

const addBtn = document.getElementById('addBtn');
const updateBtn = document.getElementById('updateBtn');

let isEditing = false;
let editingServiceId = null;

// Fetch services on page load
socket.emit('get-services');

// Render service row
function renderService(service) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${service.id}</td>
        <td>${service.name}</td>
        <td>${service.description}</td>
        <td>${service.duration} mins</td>
        <td>Rs/-${service.price}</td>
        <td>${service.availability ? 'Yes' : 'No'}</td>
        <td>
            <button onclick="editService(${service.id})">Edit</button>
        </td>
    `;
    serviceTableBody.appendChild(row);
}

// Populate form and switch to editing mode
window.editService = function(serviceId) {
    const row = Array.from(serviceTableBody.children).find(
        tr => Number(tr.children[0].textContent) === serviceId
    );

    if (row) {
        serviceName.value = row.children[1].textContent;
        serviceDescription.value = row.children[2].textContent;
        serviceDuration.value = parseInt(row.children[3].textContent);
        servicePrice.value = parseFloat(row.children[4].textContent.replace('Rs/-', ''));
        serviceAvailability.value = row.children[5].textContent === 'Yes' ? 'true' : 'false';

        isEditing = true;
        editingServiceId = serviceId;
        addBtn.style.display = 'none';
        updateBtn.style.display = 'block';
    }
};

// Add or update service
function addService() {
    const newService = {
        name: serviceName.value,
        description: serviceDescription.value,
        duration: serviceDuration.value,
        price: servicePrice.value,
        availability: serviceAvailability.value === 'true'
    };

    if (isEditing) {
        newService.id = editingServiceId;
        socket.emit('update-service', newService);
    } else {
        socket.emit('add-service', newService);
    }

    resetForm();
}

// Reset form and button states
function resetForm() {
    serviceName.value = '';
    serviceDescription.value = '';
    serviceDuration.value = '';
    servicePrice.value = '';
    serviceAvailability.value = 'true';
    isEditing = false;
    editingServiceId = null;
    addBtn.style.display = 'block';
    updateBtn.style.display = 'none';
}

// Update button click handler
updateBtn.addEventListener('click', addService);

// On receiving full service list
socket.on('service-list', (services) => {
    serviceTableBody.innerHTML = '';
    services.forEach(renderService);
});

// On new service added
socket.on('service-added', (service) => {
    renderService(service);
});

// On service updated
socket.on('service-updated', () => {
    socket.emit('get-services');
});
