const API = `http://localhost:3000`;


async function addService(e) {
    try {
        e.preventDefault();
        const serviceDetails = {
            name: document.getElementById("serviceName").value,
            description: document.getElementById("serviceDescription").value,
            duration: document.getElementById("serviceDuration").value,
            price: document.getElementById("servicePrice").value,
            availability: document.getElementById("serviceAvailability").value
        };
        const token = localStorage.getItem("token");
        const response = await axios.post(`${API}/admin/add-service`,
            serviceDetails,
            { headers: { "Authorization": `Bearer ${token}` } }
        );
        addNewServicetoUI(response.data.service);
        document.getElementById("serviceName").value = '';
        document.getElementById("serviceDescription").value = '';
        document.getElementById("serviceDuration").value = '';
        document.getElementById("servicePrice").value = '';

        //Re-fetch updated expenses list (optional but recommended)
        const servicesPerPage = localStorage.getItem("servicesPerPage") || 5;
        await fetchServices(1, servicesPerPage);
        
    } catch(err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }
    
};

window.addEventListener("DOMContentLoaded", async () => {
    const servicesPerPage = localStorage.getItem("servicesPerPage") || 5; // Default to 5
    document.getElementById("itemsPerPage").value = servicesPerPage; // Set dropdown value
    await fetchServices(1, servicesPerPage);
});

document.getElementById("itemsPerPage").addEventListener("change", async function () {
    const selectedLimit = this.value;
    localStorage.setItem("servicesPerPage", selectedLimit); // Store user preference
    await fetchServices(1, selectedLimit); // Fetch data with new limit
});



async function fetchServices(page, limit) {
    try {
        const token = localStorage.getItem("token");

        const response = await axios.get(`${API}/admin/get-all-services?page=${page}&limit=${limit}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        response.data.services.forEach(service => {
            addNewServicetoUI(service);
            showPagination(response.data);
        })
    } catch(err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }
}

// Update pagination buttons
async function showPagination({ currentPage, hasNextPage, nextPage, hasPreviousPage, previousPage, lastPage }) {
    try {
        const pagination = document.getElementById("pagination");
        pagination.innerHTML = '';

        const limit = localStorage.getItem("servicesPerPage") || 5; // Get stored limit

        if (hasPreviousPage) {
            const btnPrev = document.createElement('button');
            btnPrev.innerHTML = previousPage;
            btnPrev.addEventListener('click', () => fetchServices(previousPage, limit));
            pagination.appendChild(btnPrev);
        }

        const btnCurrent = document.createElement('button');
        btnCurrent.innerHTML = `<h3>${currentPage}</h3>`;
        btnCurrent.addEventListener('click', () => fetchServices(currentPage, limit));
        pagination.appendChild(btnCurrent);

        if (hasNextPage) {
            const btnNext = document.createElement('button');
            btnNext.innerHTML = nextPage;
            btnNext.addEventListener('click', () => fetchServices(nextPage, limit));
            pagination.appendChild(btnNext);
        }
    } catch (err) {
        console.log(err);
    }
}



async function addNewServicetoUI(service) {
    const serviceListBody = document.getElementById('serviceList');

    const row = document.createElement('tr');
    row.classList.add('service-row'); // ✅ Needed for editService
    row.dataset.id = service.id;
    row.dataset.name = service.name;
    row.dataset.description = service.description;
    row.dataset.duration = service.duration;
    row.dataset.price = service.price;
    row.dataset.availability = service.availability;
    row.innerHTML = `
        <td>${service.id}</td>
        <td>${service.name}</td>
        <td>${service.description}</td>
        <td>${service.duration} mins</td>
        <td>Rs/-${service.price}</td>
        <td>${service.availability === true ? "Available" : "Unavailable"}</td>
        <td>
            <button class="edit-btn" onclick='editService(event, ${service.id})'>Edit</button>
            <button class="delete-btn" onclick='deleteService(event, ${service.id})'>Delete</button>
        </td>
        `;
    serviceListBody.appendChild(row);
};

function editService(e, serviceId) {
    e.preventDefault();
    const row = e.target.closest(".service-row");

    if (!row) {
        console.error("Could not find the row. Is .service-row class missing?");
        return;
    }

    document.getElementById("serviceName").value = row.dataset.name;
    document.getElementById("serviceDescription").value = row.dataset.description;
    document.getElementById("serviceDuration").value = row.dataset.duration;
    document.getElementById("servicePrice").value = row.dataset.price;
    document.getElementById("serviceAvailability").value = row.dataset.availability;


    // Store the service ID in hidden input
    document.getElementById("serviceId").value = serviceId;

    // Toggle buttons
    document.getElementById("addBtn").style.display = 'none';
    document.getElementById("updateBtn").style.display = 'block';
}

async function updateService(e) {
    e.preventDefault();

    const id = document.getElementById("serviceId").value;  // get ID here
    const name = document.getElementById("serviceName").value;
    const description = document.getElementById("serviceDescription").value;
    const duration = document.getElementById("serviceDuration").value;
    const price = document.getElementById("servicePrice").value;
    const availability = document.getElementById("serviceAvailability").value;
    const token = localStorage.getItem("token");

    try {
        const response = await axios.put(`${API}/admin/edit-service/${id}`, {
            name,
            description,
            duration,
            price,
            availability
        }, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.data.success) {
            alert("Service updated successfully.");
            location.reload();
        } else {
            alert(response.data.message || "Failed to update service.");
        }
    } catch (err) {
        console.error(err);
        alert("An error occurred while updating the service.");
    }
}

async function deleteService(e, serviceId) {
    try {
        const token = localStorage.getItem("token");
        const response = await axios.delete(`${API}/admin/delete-service/${serviceId}`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        if(response.data.success) {
            alert(response.data.message);
            location.reload();
        } else {
            alert(data.message || "Failed to delete service.");
        }
    } catch (error) {
        console.error("Delete error:", error);
        alert("An error occurred while deleting the service.");
    }
};

