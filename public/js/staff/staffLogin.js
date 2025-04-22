const socket = io("http://localhost:3000");

async function login(e) {
    e.preventDefault();

    const loginDetails = {
        staffemail: e.target.staffEmail.value,
        staffpassword: e.target.staffPassword.value
    };

    // Emit login event to the server
    socket.emit("staff-login", loginDetails);

    // Listen for server response
    socket.on("staff-login-response", (data) => {
        if (data.success) {
            alert("Login successful");
            localStorage.setItem("token", data.token); // Store token in localStorage
            window.location.href = "/html/staff/home.html"; // Redirect to staff home page
        } else {
            alert(data.message);
            document.body.innerHTML += `<div style="color:red;">${data.message}</div>`;
        }

        // Clear input fields
        document.getElementById("staffEmail").value = "";
        document.getElementById("staffPassword").value = "";
    });
}
