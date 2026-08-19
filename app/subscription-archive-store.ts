type ArchiveRow = {
  subscription_id: number;
  status_at_archive: string;
  archived_at: string;
  note: string;
};

function d1() {
  const binding = (globalThis as typeof globalThis & { __YURI_DB?: D1Database }).__YURI_DB;
  if (!binding) throw new Error("D1 indisponível para arquivo de assinaturas");
  return binding;
}

export async function ensureSubscriptionArchiveStore() {
  await d1().prepare(`
    CREATE TABLE IF NOT EXISTS subscription_archives (
      subscription_id INTEGER PRIMARY KEY,
      status_at_archive TEXT NOT NULL DEFAULT '',
      archived_at TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    )
  `).run();
}

export async function getArchivedSubscriptionIds() {
  await ensureSubscriptionArchiveStore();
  const result = await d1()
    .prepare("SELECT subscription_id FROM subscription_archives")
    .all<{ subscription_id: number }>();
  return new Set((result.results || []).map((row) => Number(row.subscription_id)));
}

export async function getSubscriptionArchiveRows() {
  await ensureSubscriptionArchiveStore();
  const result = await d1()
    .prepare("SELECT subscription_id, status_at_archive, archived_at, note FROM subscription_archives ORDER BY archived_at DESC")
    .all<ArchiveRow>();
  return result.results || [];
}

export async function archiveSubscription(input: { subscriptionId: number; status: string; note?: string }) {
  await ensureSubscriptionArchiveStore();
  const now = new Date().toISOString();
  await d1()
    .prepare(`
      INSERT INTO subscription_archives (subscription_id, status_at_archive, archived_at, note)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(subscription_id) DO UPDATE SET
        status_at_archive = excluded.status_at_archive,
        archived_at = excluded.archived_at,
        note = excluded.note
    `)
    .bind(input.subscriptionId, input.status, now, String(input.note || "").trim(),)
    .run();
  return now;
}

export async function unarchiveSubscription(subscriptionId: number) {
  await ensureSubscriptionArchiveStore();
  await d1().prepare("DELETE FROM subscription_archives WHERE subscription_id = ?").bind(subscriptionId).run();
}
