/**
 * Cartão fidelidade: a cada 8 atendimentos finalizados e pagos, o próximo é
 * gratuito. Atendimentos pagos como "Cortesia" não entram na contagem.
 */

export const LOYALTY_TARGET = 8;

export type LoyaltyProfile = {
  loyaltyAdjustment: number | null;
  loyaltyRewardsRedeemed: number | null;
};

export type LoyaltySnapshot = {
  target: number;
  eligibleVisits: number;
  progress: number;
  earnedRewards: number;
  redeemedRewards: number;
  availableRewards: number;
  rewardAvailable: boolean;
  manualAdjustment: number;
};

/**
 * @param paidVisits atendimentos finalizados que não foram cortesia
 */
export function loyaltySnapshot(profile: LoyaltyProfile, paidVisits: number): LoyaltySnapshot {
  const manualAdjustment = Number(profile.loyaltyAdjustment || 0);
  const redeemedRewards = Math.max(0, Number(profile.loyaltyRewardsRedeemed || 0));
  const eligibleVisits = Math.max(0, paidVisits + manualAdjustment);
  const earnedRewards = Math.floor(eligibleVisits / LOYALTY_TARGET);
  const availableRewards = Math.max(0, earnedRewards - redeemedRewards);
  return {
    target: LOYALTY_TARGET,
    eligibleVisits,
    progress: availableRewards > 0 ? LOYALTY_TARGET : eligibleVisits % LOYALTY_TARGET,
    earnedRewards,
    redeemedRewards,
    availableRewards,
    rewardAvailable: availableRewards > 0,
    manualAdjustment,
  };
}

/**
 * Ajuste manual necessário para que o total de atendimentos válidos passe a
 * ser `targetCount`, preservando a contagem automática.
 */
export function loyaltyAdjustmentFor(targetCount: number, automaticPaidVisits: number) {
  return targetCount - automaticPaidVisits;
}
