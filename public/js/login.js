const API = `http://localhost:3000`;

async function login(e) {
    try {
        e.preventDefault();

        const loginDetails = {
            email: e.target.email.value,
            password: e.target.password.value
        };

        const response = await axios.post(`${API}/user/login`, loginDetails);

        //console.log(response);

        // Listen for server response
        if (response.data.success) {
            alert(response.data.message);
            localStorage.setItem("token", response.data.token); // Store token in localStorage
            if (response.data.role === "Admin") {
                window.location.href = "../html/admin/home.html"; // Redirect to admin home page
            } else if (response.data.role === "Customer") {
                window.location.href = "../html/customers/home.html"; // Redirect to customer home page
            }
            // Clear input fields after successful login
            e.target.email.value = "";
            e.target.password.value = "";
        }

    } catch (err) {
        console.log("Login Error:", err.response ? err.response.data.message : err.message);

        // Show error message in UI
        document.body.innerHTML += `<div style="color:red;">${err.response ? err.response.data.message : err.message}</div>`;
    }

}
