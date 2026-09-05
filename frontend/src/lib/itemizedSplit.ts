// Turns a receipt entered as line items (who had what) into the same shape the backend's
// EXACT split expects. Deliberately does all arithmetic in integer cents and only converts to
// a decimal at the very end — the backend validates that the shares sum exactly to the total
// (BigDecimal comparison), and floating-point dollar math (0.1 + 0.2 style drift) could produce
// a sum that's a fraction of a cent off and get rejected.

export interface LineItemInput {
  price: string;
  assignedUserIds: string[];
}

export interface ItemizedResult {
  amount: number;
  shares: { userId: string; amount: number }[];
}

function toCents(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function computeItemizedShares(
  items: LineItemInput[],
  extra: string,
  memberOrder: string[]
): ItemizedResult | null {
  const validItems = items.filter((i) => i.assignedUserIds.length > 0 && toCents(i.price) > 0);
  if (validItems.length === 0) return null;

  let itemsTotalCents = 0;
  const subtotalCentsByUser = new Map<string, number>();

  for (const item of validItems) {
    const priceCents = toCents(item.price);
    itemsTotalCents += priceCents;

    // An item split between N people might not divide evenly in cents (e.g. 10 cents / 3) —
    // give the first assignee(s) the extra cent(s) so the item's own shares sum exactly to it.
    const n = item.assignedUserIds.length;
    const base = Math.floor(priceCents / n);
    const remainder = priceCents - base * n;
    item.assignedUserIds.forEach((userId, index) => {
      const share = base + (index < remainder ? 1 : 0);
      subtotalCentsByUser.set(userId, (subtotalCentsByUser.get(userId) ?? 0) + share);
    });
  }

  const extraCents = Math.max(0, toCents(extra));
  const totalCents = itemsTotalCents + extraCents;
  if (totalCents <= 0) return null;

  // Preserve member order so the remainder from proportionally distributing tax/tip has a
  // deterministic place to land (the last contributor), rather than object key iteration order.
  const userIds = memberOrder.filter((id) => subtotalCentsByUser.has(id));

  let allocatedExtra = 0;
  const shares = userIds.map((userId, index) => {
    const subtotal = subtotalCentsByUser.get(userId)!;
    let extraShare: number;
    if (index === userIds.length - 1) {
      extraShare = extraCents - allocatedExtra;
    } else {
      extraShare = Math.round((extraCents * subtotal) / itemsTotalCents);
      allocatedExtra += extraShare;
    }
    return { userId, amountCents: subtotal + extraShare };
  });

  return {
    amount: totalCents / 100,
    shares: shares.map((s) => ({ userId: s.userId, amount: s.amountCents / 100 })),
  };
}
