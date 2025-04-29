const API = `http://localhost:3000`;
const token = localStorage.getItem("token");

const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phonenumber');
const form = document.getElementById('profileForm');
const profileTableBody = document.getElementById('profileTableBody');

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await axios.get(`${API}/customer/get-profile`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );
        if (response.data.success) {
            displayProfile(response.data.profile);
        }
    } catch (err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }
});

async function displayProfile(profile) {
    const row = document.createElement('tr');
    row.classList.add('profile-row'); // ✅ Needed for editService
    row.dataset.id = profile.id;
    row.dataset.name = profile.name;
    row.dataset.email = profile.email;
    row.dataset.phonenumber = profile.phonenumber;
    row.innerHTML = `
            <td>${profile.id}</td>
            <td>${profile.name}</td>
            <td>${profile.email}</td>
            <td>${profile.phonenumber}</td>
            <td><button class="edit-btn" onclick='editProfile(event, ${profile.id})'>Edit</button></td>
    `;
    profileTableBody.appendChild(row);

};

async function editProfile(e, profileId) {
    try {
        e.preventDefault();
        const row = e.target.closest(".profile-row");

        if (!row) {
            console.error("Could not find the row. Is .service-row class missing?");
            return;
        }

        document.getElementById("name").value = row.dataset.name;
        document.getElementById("email").value = row.dataset.email;
        document.getElementById("phonenumber").value = row.dataset.phonenumber;

        // Toggle buttons
        document.getElementById("profileForm").style.display = 'block';
    } catch (err) {
        console.error("Error:", err.response ? err.response.data.message : err.message);
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }
};

async function updateProfile(e) {
    e.preventDefault();
        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const phonenumber = document.getElementById("phonenumber").value;
    try {
        const response = await axios.put(`${API}/customer/update-profile`, {
            name,
            email, 
            phonenumber
        }, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (response.data.success) {
            alert("Profile updated successfully.");
            location.reload();
        } else {
            alert(response.data.message || "Failed to update profile.");
        }
    } catch (err) {
        console.error(err);
        alert("An error occurred while updating the profile.");
    }
}