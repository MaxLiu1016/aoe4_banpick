import bcrypt from "bcryptjs";
import { dbConnect } from "./mongoose";
import { User } from "./models/User";
import { Preset } from "./models/Preset";
import { DEMO_PRESETS } from "../data/demoPresets";
import { withEnglishStepLabels } from "./draft/stepLabel";

// Admin credentials come from env vars; fall back to simple defaults for local dev.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Max";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123";

/**
 * Idempotent startup seed: ensures the super-admin and the demo presets exist on
 * every fresh database. Safe to call on every boot.
 */
export async function seedInitialData(): Promise<void> {
  await dbConnect();

  // --- Super-admin (always ensure the fixed admin credentials work) ---
  let admin = await User.findOne({ username: ADMIN_USERNAME });
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  if (!admin) {
    admin = await User.create({
      username: ADMIN_USERNAME,
      email: "max@admin.local",
      passwordHash: hash,
      isAdmin: true,
    });
  } else {
    admin.isAdmin = true;
    admin.passwordHash = hash; // enforce the configured admin password
    await admin.save();
  }

  // --- Demo presets (public, cloneable, owned by admin) ---
  // Demos are locked & canonical, so on every boot we (re)normalize their step
  // labels to English — regardless of how they were originally seeded — and keep
  // them public. This also upgrades demos already in the DB with localized labels.
  for (const d of DEMO_PRESETS) {
    const config = withEnglishStepLabels(d.config);
    const existing = await Preset.findOne({ name: d.name, isDemo: true });
    if (!existing) {
      await Preset.create({
        ownerId: admin._id,
        name: d.name,
        description: d.description,
        config,
        isPublic: true,
        isDemo: true,
      });
    } else {
      existing.config = config;
      existing.isPublic = true;
      existing.markModified("config"); // config is a Mixed field
      await existing.save();
    }
  }
}
