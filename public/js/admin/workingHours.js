const API = `http://localhost:3000`;

let currentEditingId = null; // This will store the ID of the working hour being edited

document.getElementById("workingHours").addEventListener("submit", function (e) {
    e.preventDefault();
    if (currentEditingId) {
        updateWorkingHours();
    } else {
        addWorkingHours();
    }
});

document.getElementById("updateBtn").addEventListener("click", function () {
    updateWorkingHours();
});


async function addWorkingHours() {
    try {
        const day = document.getElementById("day").value;
        const startTime = document.getElementById("startTime").value;
        const endTime = document.getElementById("endTime").value;
        const token = localStorage.getItem("token");

        const workingHoursDetails = { day, startTime, endTime };
        const response = await axios.post(`${API}/admin/add-working-hours`,
            workingHoursDetails,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        if (response.data.success) {
            addWorkingHourstoUI(response.data.workingHour);
        }
    } catch (err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }

};

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API}/admin/get-working-hours`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );
        if (response.data.success) {
            response.data.workingHours.forEach(workingHour => {
                addWorkingHourstoUI(workingHour);
            });
        }

    } catch (err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }
});

async function addWorkingHourstoUI(workingHour) {
    const workingHoursList = document.getElementById('workingHoursList');

    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', workingHour.id); // store the id as attribute

    listItem.innerHTML = `
        <strong>${workingHour.day}</strong>: ${workingHour.startTime} - ${workingHour.endTime}
        <button class="edit-btn" onclick="editWorkingHours('${workingHour.id}', '${workingHour.day}', '${workingHour.startTime}', '${workingHour.endTime}')">Edit</button>
    `;

    workingHoursList.appendChild(listItem);
};


function editWorkingHours(id, day, startTime, endTime) {
    currentEditingId = id; // Save the ID for update
    document.getElementById("day").value = day;
    document.getElementById("startTime").value = startTime;
    document.getElementById("endTime").value = endTime;

    document.getElementById("submitBtn").style.display = "none";
    document.getElementById("updateBtn").style.display = "block";
};

async function updateWorkingHours() {
    
    const day = document.getElementById("day").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const token = localStorage.getItem("token");

    const data = { day, startTime, endTime };

    const response = await axios.put(`${API}/admin/update-working-hours/${currentEditingId}`,
        data,
        { headers: { "Authorization": `Bearer ${token}` } }
    );

    if (response.data.success) {
        alert(response.data.message);
        location.reload();
    }

    document.getElementById("workingHours").reset();
    document.getElementById("submitBtn").style.display = "block";
    document.getElementById("updateBtn").style.display = "none";

};



