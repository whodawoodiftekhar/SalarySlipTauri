import express from "express";
import mongoose from "mongoose";
import { User, cleanupObsoleteData } from "../models/User.js";
import { generateToken, protect } from "../middleware/auth.js";

const router = express.Router();

function getInitials(name) {
  if (!name) return "HR";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * POST /api/auth/register
 * Registers a new HR admin account with name, email, and password.
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Full Name, Email, and Password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Password must be at least 6 characters long.",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Cannot create account because MongoDB is offline. Please start local MongoDB.",
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        error: "Account Exists",
        message: "An HR account with this email address already exists. Please sign in instead.",
      });
    }

    const passwordHash = await User.hashPassword(password);
    const initials = getInitials(name);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: "HR",
      initials,
    });

    const userPayload = {
      id: user._id,
      email: user.email,
      name: user.name,
      initials: user.initials,
      role: user.role,
    };

    const token = generateToken(user);
    return res.status(201).json({ token, user: userPayload });
  } catch (err) {
    console.error("[Auth Route] Register error:", err);
    return res.status(500).json({ error: "Server Error", message: "Failed to create HR account." });
  }
});

/**
 * POST /api/auth/login
 * Authenticates HR admin email and password.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Validation Error", message: "Email and password are required." });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check DB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Database is offline. Start MongoDB to log in.",
      });
    }

    // Run cleanup of obsolete hardcoded data
    await cleanupObsoleteData();

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid Credentials", message: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Credentials", message: "Invalid email or password." });
    }

    const userPayload = {
      id: user._id,
      email: user.email,
      name: user.name,
      initials: user.initials,
      role: user.role,
    };

    const token = generateToken(user);
    return res.json({ token, user: userPayload });
  } catch (err) {
    console.error("[Auth Route] Login error:", err);
    return res.status(500).json({ error: "Server Error", message: "An error occurred during login." });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated HR profile.
 */
router.get("/me", protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      initials: req.user.initials,
      role: req.user.role,
    },
  });
});

/**
 * POST /api/auth/update-profile
 * Updates HR name and email.
 */
router.post("/update-profile", protect, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Full Name and Email / Username are required.",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Cannot update profile because MongoDB is offline. Please start local MongoDB.",
      });
    }

    // Check if email is being changed and if it conflicts with another user
    const existing = await User.findOne({ email: cleanEmail, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(400).json({
        error: "Email Taken",
        message: "This email address or username is already in use by another account.",
      });
    }

    const dbUser = await User.findById(req.user._id);
    if (!dbUser) {
      return res.status(404).json({ error: "Not Found", message: "User account not found." });
    }

    dbUser.name = cleanName;
    dbUser.email = cleanEmail;
    dbUser.initials = getInitials(cleanName);
    await dbUser.save();

    const userPayload = {
      id: dbUser._id,
      email: dbUser.email,
      name: dbUser.name,
      initials: dbUser.initials,
      role: dbUser.role,
    };

    return res.json({
      ok: true,
      user: userPayload,
      message: "Profile details updated successfully!",
    });
  } catch (err) {
    console.error("[Auth Route] Update profile error:", err);
    return res.status(500).json({ error: "Server Error", message: "Failed to update profile details." });
  }
});

/**
 * POST /api/auth/change-password
 * Allows HR to update their password.
 */
router.post("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Please fill in both New Password and Confirm Password.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: "Validation Error",
        message: "New password and confirm password do not match.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Validation Error",
        message: "New password must be at least 6 characters long.",
      });
    }

    // Fetch user with passwordHash
    const dbUser = await User.findById(req.user._id);
    if (!dbUser) {
      return res.status(404).json({ error: "Not Found", message: "User account not found." });
    }

    // Optional current password check if supplied
    if (currentPassword) {
      const isCurrentMatch = await dbUser.comparePassword(currentPassword);
      if (!isCurrentMatch) {
        return res.status(400).json({
          error: "Invalid Current Password",
          message: "The previous password you entered is incorrect.",
        });
      }
    }

    // Hash new password and save
    dbUser.passwordHash = await User.hashPassword(newPassword);
    await dbUser.save();

    return res.json({
      ok: true,
      message: "Password updated successfully! Please use your new password next time you log in.",
    });
  } catch (err) {
    console.error("[Auth Route] Change password error:", err);
    return res.status(500).json({ error: "Server Error", message: "Failed to update password." });
  }
});

export default router;
