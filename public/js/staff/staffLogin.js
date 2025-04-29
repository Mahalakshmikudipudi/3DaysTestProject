const API = `http://localhost:3000`;

async function login(e) {
    e.preventDefault();
    try {
        const loginDetails = {
            staffemail: e.target.staffEmail.value,
            staffpassword: e.target.staffPassword.value
        };
        const response = await axios.post(`${API}/staff/staff-login`, loginDetails);
    
        //console.log(response);
    
        // Listen for server response
        if (response.data.success) {
            alert(response.data.message);
            localStorage.setItem("token", response.data.token); // Store token in localStorage
            window.location.href = "/public/html/staff/home.html";
            
        }
    
            // Clear input fields
            document.getElementById("staffEmail").value = "";
            document.getElementById("staffPassword").value = "";
        
    } catch (err) {
        console.log("Login Error:", err.response ? err.response.data.message : err.message);

        // Show error message in UI
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }

}
