import express from "express";
import mongoose from "mongoose";
import { User, seedInitialHRUser, getActiveOutlookEmail, decryptPassword, encryptPassword } from "../models/User.js";
import { describeMailAccount } from "../models/MailAccount.js";
import { generateToken, protect } from "../middleware/auth.js";
import { sendDirectPasswordEmail } from "../services/emailService.js";

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

    const user = await User.findOne({ email: cleanEmail });

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
 * Fetches configured email address from mailaccount collection
 * and sends plain login password directly to their Outlook email.
 */
router.post("/forgot-password", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "MongoDB is offline. Please start local MongoDB.",
      });
    }

    // Fetch user from users collection
    let user = await User.findOne({});
    if (!user) {
      return res.status(404).json({
        error: "User Not Found",
        message: "No registered HR administrator account was found in the database.",
      });
    }

    // Fetch recipient email address from mailaccount collection
    let targetEmail = user.email;
    try {
      const mailAcc = await describeMailAccount();
      if (mailAcc && mailAcc.user && mailAcc.user.trim()) {
        targetEmail = mailAcc.user.trim();
      }
    } catch (err) {
      console.warn("[Auth Route] Could not read mailaccount collection, fallback to user.email:", err.message);
    }

    // Decrypt encrypted MongoDB password into plain text for email delivery
    const plainPassword = decryptPassword(user.password);

    // Send direct password email via Outlook service
    await sendDirectPasswordEmail({
      toEmail: targetEmail,
      password: plainPassword,
    });

    return res.json({
      ok: true,
      email: targetEmail,
      message: "Your login password has been sent to your registered Outlook email address! Please check your inbox.",
    });
  } catch (err) {
    console.error("[Auth Route] Forgot password error:", err);
    return res.status(500).json({ error: "Server Error", message: "Failed to send password email." });
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
 * Allows HR to update their password securely.
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

    // Encrypt new password using AES encryption before saving
    dbUser.password = encryptPassword(newPassword);
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
