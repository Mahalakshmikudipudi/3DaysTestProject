const socket = io("http://localhost:3000");

async function signup(e) {
    e.preventDefault();

    const signupDetails = {
        name: e.target.name.value,
        email: e.target.email.value,
        phonenumber: e.target.phonenumber.value,
        password: e.target.password.value,
        role: e.target.role.value
    };

    // Emit signup event to the server
    socket.emit("signup", signupDetails);
    console.log("Signup details sent:", signupDetails);

    
}

// Listen for server response
socket.on("signup-response", (data) => {
    console.log(data); // Log the response for debugging
    // Handle success or error response
    if (data.success) {
        alert("Successfully signed up");
        window.location.href = "/html/login.html"; // Redirect to login page
    } else {
        alert(data.message);
        document.body.innerHTML += `<div style="color:red;">${data.message}</div>`;
    }

    // Clear input fields
    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("phonenumber").value = "";
    document.getElementById("password").value = "";
    document.getElementById("role").value = "";
});
