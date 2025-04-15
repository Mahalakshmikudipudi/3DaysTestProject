const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});


function logout() {
    const token = localStorage.getItem("token");
    if (socket && token) {
      // Emit logout event via socket only
      socket.emit("logout", { token });

      // Optional: Wait for acknowledgment from server
      socket.on("logoutSuccess", (msg) => {
        alert(msg || "Logged out successfully via socket!");
        localStorage.removeItem("token");
        window.location.href = "/public/html/home.html"; // Redirect
      });

      // If error comes back
      socket.on("logoutError", (errMsg) => {
        alert("Logout failed: " + errMsg);
      });
    } else {
      alert("User not authenticated or socket not connected.");
    }
  }
