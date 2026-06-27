"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import OwnerGuard from "@/components/auth/OwnerGuard";
import { supabase } from "@/lib/supabase";
import { fieldRequestDecisionEmail } from "@/lib/email/fieldRequestEmails";

type RequestStatus = "pending" | "payment_pending" | "active" | "suspended" | "rejected";

type FieldRequest = {
  id: string;
  created_at: string;
  field_name: string;
  owner_name: string;
  email: string;
  phone: string;
  city: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  message: string | null;
  status: RequestStatus;
  admin_notes: string | null;
  decision_message: string | null;
  reviewed_at: string | null;
  access_status?: RequestStatus | null;
  trial_started_at?: string | null;
  subscription_valid_until?: string | null;
  grace_until?: string | null;
  access_blocked_reason?: string | null;
};

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  pending: {
    label: "Разглежда се",
    className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
  },
  payment_pending: {
    label: "Очаква плащане",
    className: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  },
  active: {
    label: "Активен",
    className: "border-lime-400/30 bg-lime-400/10 text-lime-300",
  },
  suspended: {
    label: "Спрян",
    className: "border-orange-400/30 bg-orange-400/10 text-orange-200",
  },
  rejected: {
    label: "Отказан",
    className: "border-red-400/30 bg-red-400/10 text-red-200",
  },
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<FieldRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<FieldRequest | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("field_requests")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Грешка при зареждане на заявките: " + error.message);
      return;
    }

    setRequests((data || []) as FieldRequest[]);
  }

  async function updateStatus(request: FieldRequest, status: RequestStatus) {
    const confirmed = confirm(
      `Сигурен ли си, че искаш да смениш статуса на "${statusConfig[status].label}"?

Ако избираш Approve, системата ще създаде login акаунт, ще активира 1 месец безплатен тест и ще изпрати email с линк за задаване на парола.`,
    );

    if (!confirmed) return;

    setSavingId(request.id);
    setEmailStatus(null);

    const response = await fetch("/api/admin/field-request-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: request.id, status }),
    });

    const result = await response.json().catch(() => null);
    setSavingId(null);

    if (!response.ok || !result?.ok) {
      alert(result?.message || "Грешка при промяна на статуса.");
      return;
    }

    setEmailStatus(result.message || `Статусът е запазен успешно за ${request.email}.`);
    await loadRequests();
  }

  async function deleteRequest(request: FieldRequest) {
    const confirmed = confirm(
      `Сигурен ли си, че искаш да изтриеш заявката за "${request.field_name}"?

Това действие е необратимо. След изтриване можеш да подадеш нова тестова заявка със същия телефон или email.`,
    );

    if (!confirmed) return;

    setDeletingId(request.id);

    const rpcResult = await supabase.rpc("delete_field_request", {
      request_id: request.id,
    });

    if (rpcResult.error) {
      const directResult = await supabase
        .from("field_requests")
        .delete()
        .eq("id", request.id);

      if (directResult.error) {
        setDeletingId(null);
        alert(
          "Заявката не беше изтрита. Пусни SQL файла supabase-v6.7.4-force-delete.sql в Supabase и пробвай пак. Детайл: " +
            directResult.error.message,
        );
        return;
      }
    }

    const verifyResult = await supabase
      .from("field_requests")
      .select("id")
      .eq("id", request.id)
      .maybeSingle();

    setDeletingId(null);

    if (verifyResult.data) {
      alert(
        "Delete бутонът работи, но Supabase още блокира реалното триене. Пусни SQL файла supabase-v6.7.4-force-delete.sql в Supabase SQL Editor → New Query → Run и пробвай пак.",
      );
      await loadRequests();
      return;
    }

    setRequests((current) => current.filter((item) => item.id !== request.id));

    if (selected?.id === request.id) {
      setSelected(null);
    }

    setEmailStatus("Заявката е изтрита успешно.");
    await loadRequests();
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const stats = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((request) => request.status === "pending").length,
      payment: requests.filter((request) => request.status === "payment_pending").length,
      active: requests.filter((request) => request.status === "active").length,
    };
  }, [requests]);

  return (
    <AdminShell active="requests">
      <OwnerGuard>
        <section className="space-y-5">
          <div className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-6 backdrop-blur-xl">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                  Owner Dashboard
                </p>
                <h2 className="mt-2 text-4xl font-black">Field Requests</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Тук виждаш заявките за достъп до BattleBooking. При промяна на статус системата изпраща автоматичен email, ако Email Engine е конфигуриран.
                </p>
              </div>

              <button
                onClick={loadRequests}
                className="rounded-2xl bg-lime-500 px-5 py-3 text-center font-black text-black hover:bg-lime-400"
              >
                Обнови
              </button>
            </div>

            {emailStatus && (
              <div className="mt-5 rounded-2xl border border-lime-400/25 bg-lime-400/10 p-4 text-sm font-bold text-lime-200">
                📧 {emailStatus}
              </div>
            )}

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <DashStat label="Всички" value={stats.all} />
              <DashStat label="Нови" value={stats.pending} highlight />
              <DashStat label="Очакват плащане" value={stats.payment} />
              <DashStat label="Активни" value={stats.active} />
            </div>
          </div>

          {loading ? (
            <div className="rounded-[2rem] border border-white/10 bg-black/65 p-8 text-center text-zinc-400 backdrop-blur-xl">
              Зареждане на заявки...
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-black/65 p-8 text-center backdrop-blur-xl">
              <h3 className="text-2xl font-black">Все още няма заявки.</h3>
              <p className="mt-2 text-zinc-400">Направи тест от /register-field и после обнови тази страница.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-[2rem] border border-white/10 bg-black/65 p-5 backdrop-blur-xl"
                >
                  <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-black">{request.field_name}</h3>
                        <StatusBadge status={request.status} />
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
                        <p>👤 {request.owner_name}</p>
                        <p>📍 {request.city || "няма локация"}</p>
                        <p>📞 {request.phone}</p>
                        <p>✉️ {request.email}</p>
                      </div>

                      <p className="mt-3 text-xs font-bold text-zinc-500">
                        Подадена: {formatDateTime(request.created_at)}
                      </p>

                      {(request.subscription_valid_until || request.grace_until) && (
                        <p className="mt-2 text-xs font-bold text-lime-300">
                          Валиден до: {formatDate(request.subscription_valid_until)} · Гратисен срок до: {formatDate(request.grace_until)}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[360px] xl:grid-cols-3 xl:justify-end">
                      <button className="admin-action border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]" onClick={() => setSelected(request)}>
                        View
                      </button>
                      <button disabled={savingId === request.id} className="admin-action border border-blue-400/25 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25 disabled:opacity-60" onClick={() => updateStatus(request, "payment_pending")}>
                        Payment
                      </button>
                      <button disabled={savingId === request.id} className="admin-action border border-lime-400/30 bg-lime-400/15 text-lime-200 hover:bg-lime-400/25 disabled:opacity-60" onClick={() => updateStatus(request, "active")}>
                        Approve
                      </button>
                      <button disabled={savingId === request.id} className="admin-action border border-orange-400/25 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25 disabled:opacity-60" onClick={() => updateStatus(request, "suspended")}>
                        Suspend
                      </button>
                      <button disabled={savingId === request.id} className="admin-action border border-red-400/25 bg-red-500/15 text-red-200 hover:bg-red-500/25 disabled:opacity-60" onClick={() => updateStatus(request, "rejected")}>
                        Reject
                      </button>
                      <button
                        disabled={deletingId === request.id}
                        className="admin-action border border-red-400/30 bg-red-950/70 text-red-100 hover:bg-red-900 disabled:opacity-60"
                        onClick={() => deleteRequest(request)}
                      >
                        {deletingId === request.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {selected && <RequestDetails request={selected} onClose={() => setSelected(null)} />}
        </section>
      </OwnerGuard>
    </AdminShell>
  );
}

async function sendDecisionEmail({
  email,
  fieldName,
  status,
}: {
  email: string;
  fieldName: string;
  status: RequestStatus;
}) {
  try {
    const response = await fetch("/api/email/field-request-decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fieldName, status }),
    });

    const data = await response.json().catch(() => null);
    return {
      ok: Boolean(data?.ok),
      message: String(data?.message || "Email service error"),
    };
  } catch {
    return { ok: false, message: "Email service error" };
  }
}

function RequestDetails({ request, onClose }: { request: FieldRequest; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-lime-400/20 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-lime-300">Request Details</p>
            <h3 className="mt-2 text-3xl font-black">{request.field_name}</h3>
          </div>
          <button onClick={onClose} className="rounded-2xl bg-white/[0.06] px-4 py-2 font-black hover:bg-white/[0.12]">
            ✕
          </button>
        </div>

        <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          <Detail label="Статус" value={statusConfig[request.status].label} />
          <Detail label="Подадена" value={formatDateTime(request.created_at)} />
          <Detail label="Организатор" value={request.owner_name} />
          <Detail label="Email" value={request.email} />
          <Detail label="Телефон" value={request.phone} />
          <Detail label="Локация" value={request.city || "-"} />
          <Detail label="Website" value={request.website || "-"} />
          <Detail label="Facebook" value={request.facebook || "-"} />
          <Detail label="Instagram" value={request.instagram || "-"} />
          <Detail label="TikTok" value={request.tiktok || "-"} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Описание</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{request.message || "Няма описание."}</p>
        </div>

        <div className="mt-5 rounded-2xl border border-lime-400/15 bg-lime-400/5 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-300">Последно подготвено email съобщение</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
            {request.decision_message || "Все още няма решение."}
          </p>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 break-words font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const config = statusConfig[status] || statusConfig.pending;
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${config.className}`}>{config.label}</span>;
}

function DashStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-4xl font-black ${highlight ? "text-lime-300" : "text-white"}`}>{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "няма дата";
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
