"use client";

import BattleBookingLoader from "@/components/BattleBookingLoader";

import { useEffect, useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { useFeedback } from "@/components/ui/FeedbackProvider";

type Field = { id: string; field_name: string };
type ImageRow = { id: string; image_url: string; caption?: string; position_x?: number; position_y?: number };

const LIMIT = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function extensionOf(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
}

export default function Gallery() {
  const feedback = useFeedback();
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState("");
  const [images, setImages] = useState<ImageRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function token() {
    return (await supabase.auth.getSession()).data.session?.access_token || "";
  }

  async function loadFields() {
    const accessToken = await token();
    const response = await fetch("/api/admin/fields", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) {
      feedback.error(result.message || "Грешка при зареждане.");
      setInitialLoading(false);
      return;
    }

    const list: Field[] = result.fields || [];
    setFields(list);
    setFieldId((current) => current || list[0]?.id || "");
    if (list.length === 0) setInitialLoading(false);
  }

  async function loadImages(id: string) {
    if (!id) {
      setImages([]);
      return;
    }

    const accessToken = await token();
    const response = await fetch(`/api/admin/gallery?field_id=${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) {
      feedback.error(result.message || "Грешка при галерията.");
      setInitialLoading(false);
      return;
    }
    setImages(result.images || []);
    setInitialLoading(false);
  }

  useEffect(() => {
    void loadFields();
  }, []);

  useEffect(() => {
    void loadImages(fieldId);
  }, [fieldId]);

  function selectFiles(fileList: FileList) {
    if (!fieldId || busy) return;

    const remaining = LIMIT - images.length;
    if (remaining <= 0) {
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      feedback.error(`Галерията има ${LIMIT} снимки. Изтрий поне една, за да качиш нова.`);
      return;
    }

    const selected = Array.from(fileList);
    const invalid = selected.find(
      (file) => !file.type.startsWith("image/") || file.size > MAX_FILE_SIZE,
    );
    if (invalid) {
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      feedback.error("Качвай само снимки до 10 MB всяка.");
      return;
    }

    const files = selected.slice(0, Math.min(remaining, LIMIT));
    if (selected.length > remaining) {
      feedback.info(`Има място само за още ${remaining} снимки. Избрани са първите ${remaining}.`);
    }
    setSelectedFiles(files);
  }

  async function uploadSelectedFiles() {
    if (!fieldId || busy || selectedFiles.length === 0) return;

    setBusy(true);
    try {
      const accessToken = await token();

      // Re-check the server count immediately before the batch upload so the
      // 10-photo limit cannot be exceeded by a stale browser state.
      const checkResponse = await fetch(`/api/admin/gallery?field_id=${fieldId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const checkResult = await checkResponse.json();
      if (!checkResponse.ok) {
        throw new Error(checkResult.message || "Не успях да проверя галерията.");
      }

      const currentImages: ImageRow[] = checkResult.images || [];
      const remaining = LIMIT - currentImages.length;
      if (remaining <= 0) {
        throw new Error(`Галерията вече съдържа ${LIMIT} снимки.`);
      }

      const files = selectedFiles.slice(0, remaining);
      const uploadForm = new FormData();
      for (const file of files) uploadForm.append("files", file);
      uploadForm.append("field_id", fieldId);
      uploadForm.append("kind", "gallery");

      const uploadResponse = await fetch("/api/admin/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: uploadForm,
      });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadResult.message || "Снимките не бяха качени.");
      }

      const uploaded = Array.isArray(uploadResult.uploaded) ? uploadResult.uploaded : [];
      const imageUrls = uploaded.map((item: { publicUrl?: string }) => item.publicUrl).filter(Boolean);
      if (imageUrls.length !== files.length) {
        throw new Error("Не всички избрани снимки бяха качени успешно.");
      }

      const saveResponse = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ field_id: fieldId, image_urls: imageUrls }),
      });
      const saveResult = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveResult.message || "Снимките не бяха записани в галерията.");
      }

      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      await loadImages(fieldId);
      feedback.success(`${imageUrls.length} снимки са качени успешно.`);
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "Неочаквана грешка.");
      await loadImages(fieldId);
    } finally {
      setBusy(false);
    }
  }

  async function savePosition(image: ImageRow, position_x: number, position_y: number) {
    setImages((current) => current.map((item) => item.id === image.id ? { ...item, position_x, position_y } : item));
    const accessToken = await token();
    const response = await fetch("/api/admin/gallery", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ id: image.id, position_x, position_y }) });
    const result = await response.json();
    if (!response.ok) feedback.error(result.message || "Позицията не беше запазена.");
  }

  async function removeImage(id: string) {
    if (!(await feedback.confirmAction("Да изтрия ли тази снимка?"))) return;

    const accessToken = await token();
    const response = await fetch("/api/admin/gallery", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (!response.ok) return feedback.error(result.message || "Не успях да изтрия снимката.");
    await loadImages(fieldId);
  }

  if (initialLoading) {
    return (
      <AdminShell active="gallery">
        <BattleBookingLoader variant="section" title="ЗАРЕЖДА СЕ ГАЛЕРИЯТА..." subtitle="Подготвяме снимките на игрището" />
      </AdminShell>
    );
  }

  return (
    <AdminShell active="gallery">
      <section className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-5 md:p-7">
        <h2 className="text-4xl font-black">Галерия</h2>
        <p className="mt-2 text-zinc-400">
          До 10 снимки за всяко игрище. Можеш да избереш няколко снимки наведнъж.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <select
            className="bb-input"
            value={fieldId}
            onChange={(event) => setFieldId(event.target.value)}
          >
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.field_name}
              </option>
            ))}
          </select>

          <label
            className={`rounded-2xl px-5 py-3 text-center font-black ${
              busy || images.length >= LIMIT
                ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
                : "cursor-pointer bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            {`Избери снимки (${images.length}/${LIMIT})`}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={busy || images.length >= LIMIT || !fieldId}
              onChange={(event) => {
                if (event.target.files?.length) selectFiles(event.target.files);
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => void uploadSelectedFiles()}
            disabled={busy || selectedFiles.length === 0 || images.length >= LIMIT || !fieldId}
            className={`rounded-2xl px-5 py-3 text-center font-black ${
              busy || selectedFiles.length === 0 || images.length >= LIMIT || !fieldId
                ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
                : "bg-lime-400 text-black hover:bg-lime-300"
            }`}
          >
            {busy ? "Качване..." : selectedFiles.length ? `Качи избраните (${selectedFiles.length})` : "Качи избраните"}
          </button>
        </div>

        {selectedFiles.length > 0 && !busy && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-lime-400/15 bg-lime-400/5 px-4 py-3">
            <p className="text-sm text-lime-100">
              Избрани: <strong>{selectedFiles.length}</strong> снимки. Натисни „Качи избраните“, за да ги качиш наведнъж.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedFiles([]);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="shrink-0 text-sm font-bold text-zinc-300 hover:text-white"
            >
              Откажи
            </button>
          </div>
        )}

        {!fields.length && (
          <p className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
            Първо добави игрище от „Моите игрища“.
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.04]"
            >
              <img
                src={image.image_url}
                alt="Снимка от игрището"
                className="h-56 w-full object-cover"
                style={{ objectPosition: `${image.position_x ?? 50}% ${image.position_y ?? 50}%` }}
              />
              <div className="grid gap-2 p-3"><label className="text-sm text-zinc-400">Хоризонтално: {image.position_x ?? 50}%<input type="range" min="0" max="100" value={image.position_x ?? 50} onChange={(e)=>void savePosition(image,Number(e.target.value),image.position_y ?? 50)} className="w-full"/></label><label className="text-sm text-zinc-400">Вертикално: {image.position_y ?? 50}%<input type="range" min="0" max="100" value={image.position_y ?? 50} onChange={(e)=>void savePosition(image,image.position_x ?? 50,Number(e.target.value))} className="w-full"/></label></div>
              <button
                type="button"
                onClick={() => void removeImage(image.id)}
                className="w-full bg-red-500/10 p-3 font-black text-red-200"
              >
                Изтрий
              </button>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
