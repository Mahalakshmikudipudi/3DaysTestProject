const API = `http://localhost:3000`;
const token = localStorage.getItem("token");
let selectedSlots = new Set(); // to store selected slots

function getPayloadFromToken(token) {
    if (!token) return null;

    const payloadBase64 = token.split('.')[1]; // Get the payload part
    const decodedPayload = atob(payloadBase64); // Decode Base64
    return JSON.parse(decodedPayload); // Parse JSON
}

const decoded = getPayloadFromToken(token);
console.log("Decoded Token:", decoded);
const serviceId = decoded?.specializationId;

window.onload = function() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0]; // Get today's date in yyyy-mm-dd format
    dateInput.setAttribute('min', today); // Set it as min
};

// helper function to format 24h time to 12h
function formatTime(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: 'numeric', hour12: true });
};


const submitBtn = document.getElementById("submitBtn");


async function fetchSlots(e) {
    const date = document.getElementById('date').value;
    try {
        e.preventDefault();
        const response = await axios.get(`${API}/staff/get-slots`, {
            params: { date, serviceId },
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.data.success) {
            const slots = response.data.allSlots; // All possible slots
            const savedSlots = response.data.selectedSlots || []; // Slots already selected earlier

            //console.log(savedSlots);

            const slotContainer = document.getElementById("slotContainer");
            
            slotContainer.innerHTML = '';
            selectedSlots.clear(); // Clear previous selected slots

            let hasSavedSlots = savedSlots.length > 0;

            slots.forEach(slot => {
                const btn = document.createElement('button');
                if (!slot.start || !slot.end) {
                    console.error("Missing startTime or endTime for slot:", slot);
                    return; // Skip this bad slot
                }
                const startFormatted = formatTime(slot.start);
                const endFormatted = formatTime(slot.end);

                btn.innerText = `${startFormatted} - ${endFormatted}`;
                btn.className = 'slot-button available'; // Initially available
                btn.dataset.start = slot.start;
                btn.dataset.end = slot.end;

                // Check if this slot is already saved
                const isSaved = savedSlots.some(saved => 
                    saved.start?.slice(0, 5) === slot.start && saved.end?.slice(0, 5) === slot.end
                );
                

                console.log("Saved Ones:", isSaved);

                if (isSaved) {
                    btn.classList.remove('available');
                    btn.classList.add('selected'); // Gray color
                    btn.disabled = true;
                } else {
                    // If not saved already, allow selection
                    btn.onclick = () => {
                        const slotId = `${slot.start}-${slot.end}`;

                        if (selectedSlots.has(slotId)) {
                            selectedSlots.delete(slotId);
                            btn.classList.remove('selected');
                            btn.classList.add('available');
                        } else {
                            selectedSlots.add(slotId);
                            btn.classList.add('selected');
                            btn.classList.remove('available');
                        }
                    };
                }

                slotContainer.appendChild(btn);
            });
            if (hasSavedSlots) {
                submitBtn.style.display = 'none'; // Hide Submit Button if already slots exist
            } else {
                submitBtn.style.display = 'block'; // Otherwise allow submit
                submitBtn.onclick = submitSlots;
            }
        }

    } catch (err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }
}



async function submitSlots() {
    try {
        const date = document.getElementById("date").value;
        const slotsToSave = Array.from(selectedSlots).map(slot => {
            const [start, end] = slot.split('-');
            return { start, end };
        });
        await axios.post(`${API}/staff/save-slots`, { date, serviceId, slots: slotsToSave }, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        alert("Slots saved successfully!");
        // After successful save, immediately disable selected buttons
        selectedSlots.forEach(slotId => {
            const [start, end] = slotId.split('-');
            const buttons = document.querySelectorAll('.slot-button');

            buttons.forEach(button => {
                if (button.dataset.start === start && button.dataset.end === end) {
                    button.classList.add('selected'); // Make it gray
                    button.disabled = true; // Disable button
                    button.classList.remove('available'); // Remove green
                }
            });
        });

        selectedSlots.clear(); // Clear selection after submission
        submitBtn.style.display = 'none';

    } catch (err) {
        console.error(err);
        alert("Failed to save slots.");
    }

}