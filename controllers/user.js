const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Utility function to check if a string is invalid
function isStringInvalid(string) {
    return !string || string.trim().length === 0;
}

// Function to generate JWT token
const generateAccessToken = (id, name, role) => {
    return jwt.sign({ userId: id, name, role}, "secretkey", { expiresIn: "1h" });
};

// Signup function using WebSockets
const signup = async (req, res, next) => {
    try {
        const { name, email, phonenumber, password, role } = req.body;

        if (isStringInvalid(name) || isStringInvalid(email) || isStringInvalid(password) || isStringInvalid(phonenumber)) {
            return res.status(400).json({ success: false, message: "Missing fields. Please fill all details." });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            phonenumber,
            password: hashedPassword,
            role
        });

        return res.status(201).json({ success: true, message: "Signup successful! Please login." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Signup failed, try again." });
    }
};

// Login function using WebSockets
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (isStringInvalid(email) || isStringInvalid(password)) {
            return res.status(400).json({ success: false, message: "Email or password is missing" });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Incorrect password" });
        }

        const token = generateAccessToken(user.id, user.name, user.role);

        return res.status(200).json({ success: true, token, message: "Login successful!", role: user.role });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Login failed, try again." });
    }
};

module.exports = {
    signup,
    login,
    generateAccessToken
};
