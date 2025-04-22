const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Staff = require("../models/staffMember");

const authenticateSocket = (socket, callback) => {
  try {
    const tokenHeader = socket.handshake?.auth.token;

    if (!tokenHeader || typeof tokenHeader !== "string") {
      return callback(new Error("No token provided"));
    }

    // Extract token if in "Bearer <token>" format
    const token = tokenHeader.startsWith("Bearer ") ? tokenHeader.split(" ")[1] : tokenHeader;

    const decoded = jwt.verify(token, "secretkey"); // You can move "secretkey" to env

    console.log("Decoded JWT:", decoded); // 👈 Check what's inside

    // Determine whether it's a user or staff
    if (decoded.staffId) {
        Staff.findByPk(decoded.staffId)
          .then((staff) => {
            if (!staff) return callback(new Error("Staff not found"));
            socket.staff = staff;
            callback(); // Proceed
          })
          .catch((err) => callback(err));
      } else if (decoded.userId) {
        User.findByPk(decoded.userId)
          .then((user) => {
            if (!user) return callback(new Error("User not found"));
            socket.user = user;
            callback(); // Proceed
          })
          .catch((err) => callback(err));
      } else {
        return callback(new Error("Invalid token structure"));
      }
  } catch (err) {
    console.error("JWT Error:", err.message);
    callback(new Error("Invalid or expired token"));
  }
};

module.exports = {
  authenticateSocket
};



//http://13.233.159.12/