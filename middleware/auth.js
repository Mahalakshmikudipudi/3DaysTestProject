const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token; //  Get token from WebSocket handshake

        const allowedEvents = ["signup", "login"];
        if (!token && allowedEvents.some(event => socket.eventNames().includes(event))) {
            console.log(" Allowing unauthenticated signup/login");
            return next();
        }

        if (!token) {
            throw new Error("No token provided");
        }

        const decoded = jwt.verify(token, "secretkey");
        const user = await User.findByPk(decoded.userId);
        if (!user) {
            throw new Error("User not found");
        }

        socket.user = user; // Attach user to socket
        next();
    } catch (err) {
        console.error("WebSocket Authentication Error:", err);
        next(new Error("Authentication failed"));
    }
};

module.exports = { authenticateSocket };
