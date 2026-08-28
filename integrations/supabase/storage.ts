import { supabase } from "./client";

export async function uploadQuizImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from("quiz-images")
    .upload(filename, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("quiz-images").getPublicUrl(data.path);

  return publicUrl;
}

export async function uploadQuizAudio(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from("quiz-audio")
    .upload(filename, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("quiz-audio").getPublicUrl(data.path);

  return publicUrl;
}
