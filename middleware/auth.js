const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Staff = require("../models/staffMember");

const authenticate = async (req, res, next) => {
    try {
        //console.log("Authorization Header:", req.header("Authorization"));
        let token = req.header("Authorization");
            
        //console.log("Token:", token);
        // Handle "Bearer <token>" format
        if (!token || !token.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
        }

        // Extract actual token
        token = token.split(" ")[1];
        

        // Verify token
        const decoded = jwt.verify(token, "secretkey");
        
      if (decoded.userId) {
        // Find user
        const user = await User.findByPk(decoded.userId);
        //console.log("User:", user);
        if (!user) {
          return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
        }
        req.user = user; // Attach user to request
        next();
      } else {
        const staff = await Staff.findByPk(decoded.staffId);
        if(!staff) {
          return res.status(401).json({success: false, message: "Unauthorized: Staff not found"});
        }
        req.staff = staff;
        next();
      }

        
    } catch (err) {
        console.error("Authentication Error:", err);
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

module.exports = { authenticate };
