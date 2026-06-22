/**
 * Tier system for E-Bin loyalty programme.
 *
 * Tiers:
 *  ≥ 3000 pts → VVIP  (purple-gold gradient)
 *  ≥ 2000 pts → VIP   (rose-gold gradient)
 *  ≥ 1000 pts → Top Fan (amber gradient)
 *  <  1000 pts → Regular
 */

export const TIERS = [
  {
    id: "vvip",
    label: "VVIP",
    minPoints: 3000,
    emoji: "👑",
    /** CSS gradient used for the badge background */
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #f59e0b 100%)",
    /** Text colour on the badge */
    textColor: "#fff",
    /** Accent colour (used for borders, highlights) */
    accentColor: "#a855f7",
    /** Shadow glow colour */
    glowColor: "rgba(168,85,247,0.35)",
    /** Short description */
    description: "Ultimate recycler — exclusive VVIP privileges",
    /** Perks list */
    perks: [
      "Priority redemption on all rewards",
      "Exclusive VVIP-only reward catalogue",
      "2× points multiplier on every drop-off",
      "Dedicated customer support line",
      "Monthly mystery gift box",
    ],
  },
  {
    id: "vip",
    label: "VIP",
    minPoints: 2000,
    emoji: "💎",
    gradient: "linear-gradient(135deg, #be185d 0%, #ec4899 50%, #f9a8d4 100%)",
    textColor: "#fff",
    accentColor: "#ec4899",
    glowColor: "rgba(236,72,153,0.30)",
    description: "Elite recycler — special VIP benefits",
    perks: [
      "Early access to new reward drops",
      "Exclusive VIP-only reward catalogue",
      "1.5× points multiplier on every drop-off",
      "Monthly bonus points (200 pts)",
    ],
  },
  {
    id: "topfan",
    label: "Top Fan",
    minPoints: 1000,
    emoji: "⭐",
    gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fcd34d 100%)",
    textColor: "#fff",
    accentColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.30)",
    description: "Dedicated recycler — Top Fan recognition",
    perks: [
      "Top Fan badge on your profile",
      "Access to Top Fan reward catalogue",
      "Bonus 50 pts on your next drop-off",
    ],
  },
  {
    id: "regular",
    label: "Regular",
    minPoints: 0,
    emoji: "♻️",
    gradient: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)",
    textColor: "#fff",
    accentColor: "#6b7280",
    glowColor: "rgba(107,114,128,0.20)",
    description: "Keep recycling to level up!",
    perks: ["Earn 1 pt per kg of e-waste recycled", "Redeem points for rewards"],
  },
];

/**
 * Return the tier object for a given point total.
 * @param {number} points
 * @returns {object} tier
 */
export function getTier(points = 0) {
  return TIERS.find((t) => points >= t.minPoints) ?? TIERS[TIERS.length - 1];
}

/**
 * Return the NEXT tier (the one the user is working towards), or null if max tier.
 * @param {number} points
 * @returns {object|null}
 */
export function getNextTier(points = 0) {
  const current = getTier(points);
  const currentIdx = TIERS.indexOf(current);
  return currentIdx > 0 ? TIERS[currentIdx - 1] : null;
}

/**
 * Progress percentage towards the next tier (0-100).
 * @param {number} points
 * @returns {number}
 */
export function getTierProgress(points = 0) {
  const current = getTier(points);
  const next = getNextTier(points);
  if (!next) return 100; // already max tier
  const range = next.minPoints - current.minPoints;
  const progress = points - current.minPoints;
  return Math.min(100, Math.round((progress / range) * 100));
}
