const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Utility function to check if a string is invalid
function isStringInvalid(string) {
    return !string || string.trim().length === 0;
}

// Function to generate JWT token
const generateAccessToken = (id, name, role, isPremiumUser) => {
    return jwt.sign({ userId: id, name, role, isPremiumUser }, "secretkey", { expiresIn: "1h" });
};

// Signup function using WebSockets
const signup = async (io, socket, data) => {
    try {   
        console.log("Data is:", data);
        // Destructure data from the socket event
        if (!data) {    
            return socket.emit("signup-response", { success: false, message: "Invalid data" });
        }
        const { name, email, phonenumber, password, role } = data;

        // Check for missing fields
        if (isStringInvalid(name) || isStringInvalid(email) || isStringInvalid(password) || isStringInvalid(phonenumber)) {
            return socket.emit("signup-response", { success: false, message: "Missing fields. Please fill all details." });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return socket.emit("signup-response", { success: false, message: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        await User.create({
            name,
            email,
            phonenumber,
            password: hashedPassword,
            role
        });

        // Send success response
        socket.emit("signup-response", { success: true, message: "Signup successful! Please login." });
    } catch (error) {
        console.error(error);
        socket.emit("signup-response", { success: false, message: "Signup failed, try again." });
    }
};

// Login function using WebSockets
const login = async (io, socket, data ) => {
    try {
        const { email, password } = data;

        // Check for missing fields
        if (isStringInvalid(email) || isStringInvalid(password)) {
            return socket.emit("login-response", { success: false, message: "Email or password is missing" });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return socket.emit("login-response", { success: false, message: "User not found" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return socket.emit("login-response", { success: false, message: "Incorrect password" });
        }

        // Generate JWT token
        const token = generateAccessToken(user.id, user.name, user.role, user.isPremiumUser);

        // Send success response with token
        socket.emit("login-response", { success: true, token, message: "Login successful!" , role:user.role});
    } catch (error) {
        console.error(error);
        socket.emit("login-response", { success: false, message: "Login failed, try again." });
    }
};

module.exports = {
    signup,
    login,
    generateAccessToken
};
