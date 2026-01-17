"use client";

import { motion } from "framer-motion";
import {
  FiShield,
  FiLock,
  FiDatabase,
  FiMail,
  FiEye,
  FiUser,
  FiSettings,
  FiTrash2,
  FiCheckCircle,
} from "react-icons/fi";

export default function PrivacyPolicyPage() {
  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <FiShield className="w-8 h-8 text-primary" />
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </motion.div>

      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/20"
      >
        <div className="flex items-start gap-3">
          <FiCheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="text-foreground font-medium">
              Your privacy is important to us.
            </p>
            <p>
              Nocturne is committed to protecting your personal information and
              your right to privacy. This Privacy Policy explains what
              information we collect, how we use it, and what rights you have.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Data We Collect */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FiDatabase className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Data We Collect</h2>
            <p className="text-xs text-muted-foreground">
              Information we store to provide our services
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              icon: FiUser,
              title: "Account Information",
              items: [
                "Username",
                "Email address",
                "Profile picture (optional)",
                "Account creation date",
              ],
            },
            {
              icon: FiSettings,
              title: "Reading Preferences",
              items: [
                "Theme settings (dark/light mode)",
                "Font family, size, and spacing",
                "Brightness preferences",
                "Accent colors",
              ],
            },
            {
              icon: FiEye,
              title: "Reading Data",
              items: [
                "Library content (novels added)",
                "Reading progress and position",
                "Bookmarks and notes",
                "Reading statistics",
              ],
            },
          ].map((category, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-secondary/50 border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <category.icon className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">{category.title}</h3>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {category.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.section>

      {/* How We Use Your Data */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <FiCheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">How We Use Your Data</h2>
            <p className="text-xs text-muted-foreground">
              Your data helps us improve your experience
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Provide personalized reading experience",
            "Sync your progress across devices",
            "Maintain your reading preferences",
            "Display your library and bookmarks",
            "Generate reading statistics",
            "Improve our services",
          ].map((use, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
            >
              <FiCheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Data Security */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <FiLock className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Data Security</h2>
            <p className="text-xs text-muted-foreground">
              How we protect your information
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            We implement industry-standard security measures to protect your
            personal information:
          </p>
          <ul className="space-y-2">
            {[
              "Encrypted password storage using bcrypt hashing",
              "Secure HTTPS connections for all data transmission",
              "MongoDB database with access controls",
              "Regular security updates and monitoring",
              "Data stored locally in your browser for offline features",
            ].map((measure, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <FiLock className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <span>{measure}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Your Rights */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <FiTrash2 className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Your Rights</h2>
            <p className="text-xs text-muted-foreground">
              You have control over your data
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              title: "Access Your Data",
              description:
                "You can view all your stored data through your profile and settings.",
            },
            {
              title: "Update Information",
              description:
                "Edit your profile, preferences, and reading data at any time.",
            },
            {
              title: "Delete Your Account",
              description:
                "Request complete deletion of your account and all associated data.",
            },
            {
              title: "Export Your Data",
              description:
                "Download your reading history, bookmarks, and preferences.",
            },
          ].map((right, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-secondary/50 border border-border"
            >
              <h3 className="font-semibold text-sm mb-1">{right.title}</h3>
              <p className="text-sm text-muted-foreground">
                {right.description}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Third-Party Services */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-500/10">
            <FiDatabase className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Third-Party Services</h2>
            <p className="text-xs text-muted-foreground">
              External services we use
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Nocturne uses the following third-party services to provide
            functionality:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>
                <strong>MongoDB Atlas:</strong> Database hosting (data stored
                securely)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>
                <strong>Vercel:</strong> Application hosting and deployment
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>
                <strong>Browser Storage:</strong> Local caching for offline
                reading (stored on your device)
              </span>
            </li>
          </ul>
          <p className="pt-2">
            These services have their own privacy policies and we ensure they
            meet our security standards.
          </p>
        </div>
      </motion.section>

      {/* Contact */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <FiMail className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Contact Us</h2>
            <p className="text-xs text-muted-foreground">
              Questions about privacy?
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            If you have any questions or concerns about this Privacy Policy or
            your data, please contact us:
          </p>
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-cyan-500/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <FiMail className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">
                Email Support
              </span>
            </div>
            <a
              href="mailto:support@nocturne.app"
              className="text-primary hover:underline font-medium"
            >
              support@nocturne.app
            </a>
          </div>
          <p className="text-xs">We typically respond within 24-48 hours.</p>
        </div>
      </motion.section>

      {/* Footer Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="p-4 rounded-lg bg-secondary/50 border border-border"
      >
        <p className="text-xs text-muted-foreground text-center">
          This privacy policy is effective as of{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          and will remain in effect except with respect to any changes in its
          provisions in the future, which will be in effect immediately after
          being posted on this page.
        </p>
      </motion.div>
    </div>
  );
}
