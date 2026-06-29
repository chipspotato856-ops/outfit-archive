import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("photos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Signed URLs since the bucket is private
  const withUrls = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("outfits")
        .createSignedUrl(row.storage_path, 60 * 60); // 1 hour
      return { ...row, url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ photos: withUrls });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${user.id}/${filename}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("outfits")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: row, error: insertError } = await supabase
    .from("photos")
    .insert({ user_id: user.id, storage_path: storagePath })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("outfits")
    .createSignedUrl(storagePath, 60 * 60);

  return NextResponse.json({ photo: { ...row, url: signed?.signedUrl ?? null } });
}
