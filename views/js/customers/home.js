const API = `http://localhost:3000`;


async function logout() {
  try {
      const token = localStorage.getItem('token'); // Retrieve token from local storage
      const response = await axios.post(
          `${API}/customer/logout`,
          {},
          { headers: { "Authorization": `Bearer ${token}` } }
      );

      alert(response.data.message || ' Customer logged out successfully!');
      localStorage.removeItem('token'); // Clear the token from storage
      window.location.href = "/public/html/home.html"; // Redirect to login page
  } catch (error) {
      console.error("Logout failed:", error.response ? error.response.data.message : error.message);
      document.body.innerHTML += `<div style="color:red;">${error.response ? error.response.data.message : error.message}</div>`;
  }
}
