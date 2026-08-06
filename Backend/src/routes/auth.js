import express from "express";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { User, seedInitialHRUser, getActiveOutlookEmail } from "../models/User.js";
import { generateToken, protect } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();

function getInitials(name) {
  if (!name) return "HR";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * GET /api/auth/outlook-email
 * Detects and returns the active Outlook email address on this machine.
 */
router.get("/outlook-email", async (_req, res) => {
  try {
    const outlookEmail = await getActiveOutlookEmail();
    res.json({ email: outlookEmail });
  } catch (err) {
    res.status(500).json({ error: "Failed to detect Outlook email", message: err.message });
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
      return res.status(400).json({ error: "Validation Error", message: "Email address and password are required." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();

    // Check DB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Database is offline. Start MongoDB to log in.",
      });
    }

    // Seed default user ONLY if DB is completely empty (0 users in total)
    await seedInitialHRUser();

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Fallback: If DB contains 1 user, match by user record
      const count = await User.countDocuments();
      if (count === 1) {
        user = await User.findOne({});
      }
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid Credentials", message: "Invalid email address or password." });
    }

    const isMatch = await user.comparePassword(cleanPass);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Credentials", message: "Invalid email address or password." });
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
 * POST /api/auth/forgot-password
 * Automatically fetches registered HR user from MongoDB users collection
 * and sends password reset token email via Outlook.
 */
router.post("/forgot-password", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "MongoDB is offline. Please start local MongoDB.",
      });
    }

    let targetEmail = req.body?.email ? String(req.body.email).trim().toLowerCase() : "";
    let user = null;

    if (targetEmail) {
      user = await User.findOne({ email: targetEmail });
    }

    // If no email supplied or not found by supplied email, fetch registered user from MongoDB
    if (!user) {
      user = await User.findOne({});
    }

    if (!user) {
      return res.status(404).json({
        error: "User Not Found",
        message: "No registered HR administrator account was found in the database.",
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = tokenExpiry;
    await user.save();

    const hostOrigin = req.headers.origin || `${req.protocol}://${req.get("host")}`;

    // Send email via Outlook service
    await sendPasswordResetEmail({
      toEmail: user.email,
      resetToken,
      hostOrigin,
    });

    return res.json({
      ok: true,
      message: "Password reset email sent to your registered account! Please check your Outlook inbox.",
    });
  } catch (err) {
    console.error("[Auth Route] Forgot password error:", err);
    return res.status(500).json({ error: "Server Error", message: "Failed to process password reset request." });
  }
});

/**
 * POST /api/auth/reset-password
 * Resets user password using valid token.
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Please fill in all fields: reset token, new password, and confirm password.",
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

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "MongoDB is offline. Please start local MongoDB.",
      });
    }

    // Find user with matching, non-expired reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or Expired Token",
        message: "The password reset link is invalid or has expired. Please request a new password reset email.",
      });
    }

    // Save new plain text password directly and clear token fields
    user.password = String(newPassword).trim();
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({
      ok: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (err) {
    console.error("[Auth Route] Reset password error:", err);
    return res.status(500).json({ error: "Server Error", message: "Failed to reset password." });
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
        message: "Full Name and Email Address are required.",
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
        message: "This email address is already in use by another account.",
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

    // Fetch user
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

    // Save plain text password directly
    dbUser.password = String(newPassword).trim();
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
