// Connect to the server using socket.io
const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});

function addWorkingHours() {
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const day = document.getElementById('day').value;

    if (!startTime || !endTime || !day) {
        alert("Please fill in all fields.");
        return;
    }

    // Emit the working hours data to the server
    socket.emit('set-working-hours', { startTime, endTime, day });

    // Clear the input fields
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    // Fetch the working hours when the page loads
    socket.emit('get-working-hours');
    

});

socket.on('working-hours-list', (workingHours) => {
    const workingHoursList = document.getElementById('workingHoursList');
    workingHoursList.innerHTML = ''; // Clear existing list

    workingHours.forEach(hour => updateWorkingHoursList(hour));
});


// Function to update the working hours list in the UI
function updateWorkingHoursList(data) {
    const workingHoursList = document.getElementById('workingHoursList');

    const listItem = document.createElement('li');
    listItem.innerHTML = `
        <strong>${data.day}</strong>: ${data.startTime} - ${data.endTime}
        <button class="edit-btn" onclick="editWorkingHours('${data.day}', '${data.startTime}', '${data.endTime}')">Edit</button>
    `;

    workingHoursList.appendChild(listItem);
}

function editWorkingHours(day, currentStart, currentEnd) {
    const newStart = prompt(`Enter new start time for ${day}`, currentStart);
    const newEnd = prompt(`Enter new end time for ${day}`, currentEnd);

    if (newStart && newEnd) {
        socket.emit('update-working-hours', {
            day: day,
            startTime: newStart,
            endTime: newEnd
        });
    }
}


// Listen for confirmation from the server and update the UI
socket.on('working-hours-updated', (data) => {
    socket.emit('get-working-hours');
});

