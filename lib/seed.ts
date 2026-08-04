import bcrypt from "bcryptjs";
import { dbConnect } from "./mongoose";
import { User } from "./models/User";
import { Preset } from "./models/Preset";
import { DEMO_PRESETS } from "../data/demoPresets";
import { withEnglishStepLabels } from "./draft/stepLabel";

// Admin credentials come from env vars. There is deliberately NO fallback password:
// this seed force-resets the admin's password on every boot, so a default here would
// mean any deployment that forgets to set ADMIN_PASSWORD ships a known super-admin
// login — and in a public repo that default is public knowledge. No password set =
// no admin seeding at all.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Max";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * Idempotent startup seed: ensures the super-admin and the demo presets exist on
 * every fresh database. Safe to call on every boot.
 */
export async function seedInitialData(): Promise<void> {
  await dbConnect();

  // Accounts no longer require an email. Drop the legacy unique index on `email`
  // so accounts created without one don't collide on a null key. Idempotent.
  await User.collection.dropIndex("email_1").catch(() => { /* already gone */ });

  // --- Super-admin (always ensure the fixed admin credentials work) ---
  let admin = await User.findOne({ username: ADMIN_USERNAME });
  if (ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    if (!admin) {
      admin = await User.create({
        username: ADMIN_USERNAME,
        passwordHash: hash,
        isAdmin: true,
      });
    } else {
      admin.isAdmin = true;
      admin.passwordHash = hash; // enforce the configured admin password
      await admin.save();
    }
  } else if (!admin) {
    // Nothing to own the demo presets and no safe password to invent — bail out
    // rather than create a super-admin nobody configured.
    console.warn("[seed] ADMIN_PASSWORD is not set — skipping admin + demo preset seeding.");
    return;
  } else {
    console.warn("[seed] ADMIN_PASSWORD is not set — leaving the existing admin's password untouched.");
  }

  // --- Demo presets (public, cloneable, owned by admin) ---
  // Only CREATE demos that are missing — existing demos are left untouched so the
  // super-admin can edit them in the UI and have those edits persist across
  // restarts. The data file is just the seed for a fresh database.
  for (const d of DEMO_PRESETS) {
    const exists = await Preset.findOne({ name: d.name, isDemo: true });
    if (!exists) {
      await Preset.create({
        ownerId: admin._id,
        name: d.name,
        description: d.description,
        config: withEnglishStepLabels(d.config),
        isPublic: true,
        isDemo: true,
      });
    }
  }
}
