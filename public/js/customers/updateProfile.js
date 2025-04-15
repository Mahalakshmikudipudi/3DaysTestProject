const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});

document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phonenumber');
    const form = document.getElementById('profileForm');
    const profileTableBody = document.getElementById('profileTableBody');
    
    socket.emit('getProfile');

    socket.on('profileData', (data) => {
        renderProfileTable(data);
    });
    
    function renderProfileTable(profile) {
        profileTableBody.innerHTML = `
            <tr>
                <td>${profile.id}</td>
                <td>${profile.name}</td>
                <td>${profile.email}</td>
                <td>${profile.phonenumber}</td>
                <td><button class="edit-btn" onclick='editProfile(${JSON.stringify(profile)})'>Edit</button></td>
            </tr>
        `;
    }
    
    // Step 4: Edit button fills form
    window.editProfile = function(profile) {
        nameInput.value = profile.name;
        emailInput.value = profile.email;
        phoneInput.value = profile.phonenumber;
    };
    
    // Step 5: Handle form submission to update profile
    form.addEventListener('submit', (e) => {
        e.preventDefault();
    
        const updatedData = {
            name: nameInput.value,
            email: emailInput.value,
            phonenumber: phoneInput.value
        };
    
        socket.emit('updateProfile', updatedData);
    });
    
    socket.on('profileUpdated', (data) => {
        alert(data.message);
        renderProfileTable(data.customer);
    });
    
    socket.on('profileError', (data) => {
        alert(data.message);
    });
});

