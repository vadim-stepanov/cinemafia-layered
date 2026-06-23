import { MembershipTier } from "../../generated/prisma/client";

// Tuning knobs for entitlement resolution. Pricing/quotas are deliberately
// trivial — the signature is WHERE this logic lives, not the math.
export const BASE_GUEST_QUOTA: Record<MembershipTier, number> = {
  BASIC: 1,
  PLUS: 2,
  PRO: 4,
};

export const DISCOUNT_PERCENT: Record<MembershipTier, number> = {
  BASIC: 0,
  PLUS: 5,
  PRO: 10,
};

export const EARLY_ACCESS_TIERS: Record<MembershipTier, boolean> = {
  BASIC: false,
  PLUS: true,
  PRO: true,
};

// Loyalty grants extra guest slots independently of membership: +1 per N degrees, capped.
export const LOYALTY_GUEST_BONUS_PER_DEGREES = 3;
export const LOYALTY_GUEST_BONUS_CAP = 3;
