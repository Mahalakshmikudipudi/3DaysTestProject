const API = `http://localhost:3000`;

async function signup(e) {
    try {
        e.preventDefault();
        //console.log(e.target.email.value);

        const signupDetails = {
            name: e.target.name.value,
            email: e.target.email.value,
            phonenumber:  e.target.phonenumber.value,
            password: e.target.password.value,
            role: e.target.role.value
            
        }
        console.log(signupDetails);
        const response = await axios.post(`${API}/user/signup`, signupDetails)
        if (response.status === 201) {
            window.location.href = "../html/login.html" //change the page on successful login
        } else {
            throw new Error('Failed to login')
        }
    } catch (err) {
        document.body.innerHTML += `<div style="color:red;">${err}</div>`
    }

    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("phonenumber").value = "";
    document.getElementById("password").value = "";
    

}