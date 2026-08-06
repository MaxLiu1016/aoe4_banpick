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
  // Versioned so the code can take a demo back. Normally an existing demo is left
  // alone — the super-admin edits demos in the UI and those edits have to survive a
  // restart. But when the version in data/demoPresets.ts moves ahead of the version
  // stored on the row, the file wins and the row is rewritten: that is how a fixed
  // rule set or an updated map pool actually reaches production.
  for (const d of DEMO_PRESETS) {
    const doc = await Preset.findOne({ isDemo: true, demoKey: d.key });
    if (!doc) {
      // Rows seeded before demoKey existed are matched on the name once, then
      // adopted at the current version. Adoption never overwrites: whatever is in
      // the database has been live and may have been edited, and a migration is no
      // reason to throw that away. The NEXT version bump rewrites it.
      const legacy = await Preset.findOne({ isDemo: true, demoKey: { $exists: false }, name: d.name });
      if (legacy) {
        legacy.demoKey = d.key;
        legacy.demoVersion = d.version;
        legacy.demoOrder = d.order;
        await legacy.save();
        continue;
      }
      await Preset.create({
        ownerId: admin._id,
        name: d.name,
        description: d.description,
        config: withEnglishStepLabels(d.config),
        isPublic: true,
        isDemo: true,
        demoKey: d.key,
        demoVersion: d.version,
        demoOrder: d.order,
      });
      console.log(`[seed] created demo preset "${d.name}" (${d.key} v${d.version})`);
      continue;
    }
    const stored = doc.demoVersion ?? 0;
    if (d.version > stored) {
      doc.name = d.name;
      doc.description = d.description;
      doc.config = withEnglishStepLabels(d.config);
      doc.demoVersion = d.version;
      doc.markModified("config"); // Mixed field — mongoose can't see into it
      await doc.save();
      console.log(`[seed] updated demo preset "${d.name}" (${d.key} v${stored} -> v${d.version})`);
    }
    // Order is synced every boot, outside the version gate. It says where a demo
    // sits in the list, not what it is — nobody can change it from the UI, so
    // there is no edit to protect, and reshuffling the shop window shouldn't
    // require pretending the rules changed.
    if (doc.demoOrder !== d.order) {
      await Preset.updateOne({ _id: doc._id }, { $set: { demoOrder: d.order } });
    }
  }
}
