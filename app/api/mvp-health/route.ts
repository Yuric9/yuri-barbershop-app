import { getDb } from "../../../db";
import { appointments, appointmentSlots, transactions } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Acesso restrito ao administrador" }, { status: 403 });

  const db = getDb();
  const [appointmentRows, transactionRows, slotRows] = await Promise.all([
    db.select().from(appointments),
    db.select().from(transactions),
    db.select().from(appointmentSlots),
  ]);

  const transactionByAppointment = new Map<number, number>();
  const duplicateCashAppointments: number[] = [];
  for (const transaction of transactionRows) {
    if (!transaction.appointmentId) continue;
    const count = (transactionByAppointment.get(transaction.appointmentId) || 0) + 1;
    transactionByAppointment.set(transaction.appointmentId, count);
    if (count === 2) duplicateCashAppointments.push(transaction.appointmentId);
  }

  const activeAppointmentsWithoutSlot = appointmentRows
    .filter((item) => item.status !== "Cancelado" && item.status !== "Finalizado")
    .filter((item) => !slotRows.some((slot) => slot.appointmentId === item.id));

  const cancelledWithSlot = appointmentRows
    .filter((item) => item.status === "Cancelado")
    .filter((item) => slotRows.some((slot) => slot.appointmentId === item.id));

  const finalizedWithoutCash = appointmentRows
    .filter((item) => item.status === "Finalizado" && item.paymentMethod !== "Cortesia")
    .filter((item) => !item.cashTransactionId || !transactionRows.some((transaction) => transaction.id === item.cashTransactionId && transaction.appointmentId === item.id));

  const finalizedWithWrongCashLink = appointmentRows
    .filter((item) => item.status === "Finalizado" && item.paymentMethod !== "Cortesia" && item.cashTransactionId)
    .filter((item) => !transactionRows.some((transaction) => transaction.id === item.cashTransactionId && transaction.appointmentId === item.id));

  const courtesyWithoutCash = appointmentRows
    .filter((item) => item.status === "Finalizado" && item.paymentMethod === "Cortesia")
    .filter((item) => item.cashTransactionId !== null);

  const checks = {
    cancelledReleaseSlots: cancelledWithSlot.length === 0,
    finalizedHaveCash: finalizedWithoutCash.length === 0,
    finalizedCashLinks: finalizedWithWrongCashLink.length === 0,
    courtesyHasNoCash: courtesyWithoutCash.length === 0,
    noDuplicateCashByAppointment: duplicateCashAppointments.length === 0,
    pendingAndConfirmedHaveReservationSlot: activeAppointmentsWithoutSlot.length === 0,
  };

  return Response.json({
    ok: Object.values(checks).every(Boolean),
    checks,
    counts: {
      appointments: appointmentRows.length,
      transactions: transactionRows.length,
      slots: slotRows.length,
      duplicateCashAppointments: duplicateCashAppointments.length,
      activeAppointmentsWithoutSlot: activeAppointmentsWithoutSlot.length,
      cancelledWithSlot: cancelledWithSlot.length,
      finalizedWithoutCash: finalizedWithoutCash.length,
    },
    details: {
      duplicateCashAppointments,
      activeAppointmentsWithoutSlot: activeAppointmentsWithoutSlot.map((item) => item.id),
      cancelledWithSlot: cancelledWithSlot.map((item) => item.id),
      finalizedWithoutCash: finalizedWithoutCash.map((item) => item.id),
    },
  });
}
