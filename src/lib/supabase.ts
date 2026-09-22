import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  console.warn(
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in admin/.env",
  );
}

export const supabase = createClient(url ?? "", anon ?? "");

export async function uploadImage(
  bucket: "team" | "case-studies" | "clients" | "insights",
  file: File,
  path?: string,
) {
  const objectPath =
    path ?? `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    upsert: true,
    contentType: file.type || "image/webp",
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}
