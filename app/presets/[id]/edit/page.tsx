import { redirect, notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { SiteHeader } from "@/components/SiteHeader";
import { PresetEditor } from "@/components/preset/PresetEditor";
import { getCurrentUser } from "@/lib/session";
import { dbConnect } from "@/lib/mongoose";
import { Preset } from "@/lib/models/Preset";
import { toClientPreset } from "@/lib/presets";

export const dynamic = "force-dynamic";

export default async function PresetEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isValidObjectId(id)) notFound();

  await dbConnect();
  const doc = await Preset.findById(id).lean();
  if (!doc) notFound();

  const preset = toClientPreset(doc as never, user.id);
  if (!preset.isOwner) redirect("/presets");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <PresetEditor initial={preset} />
      </main>
    </>
  );
}
