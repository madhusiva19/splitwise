"use client";

import { useMemo } from "react";
import Card from "@/components/Card";
import Money from "@/components/Money";
import EmptyState from "@/components/EmptyState";
import { CardListSkeleton } from "@/components/Skeleton";
import { downloadCsv } from "@/lib/csv";
import { useCurrency } from "@/lib/currency";
import { BalanceResponse } from "@/lib/expenses";

interface BalancesTabProps {
  groupName: string;
  balances: BalanceResponse[] | null;
  currentUserId: string;
}

export default function BalancesTab({ groupName, balances, currentUserId }: BalancesTabProps) {
  const { code, symbol } = useCurrency();

  const balanceSummary = useMemo(() => {
    if (!balances) return null;
    const mine = balances.find((b) => b.userId === currentUserId);
    return mine ? mine.netBalance : 0;
  }, [balances, currentUserId]);

  const sortedBalances = useMemo(() => {
    if (!balances) return null;
    return [...balances].sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  }, [balances]);

  function handleExportCsv() {
    if (!balances) return;

    const rows = balances.map((b) => {
      const status =
        b.netBalance > 0.004
          ? `is owed ${symbol}${b.netBalance.toFixed(2)}`
          : b.netBalance < -0.004
          ? `owes ${symbol}${Math.abs(b.netBalance).toFixed(2)}`
          : "settled up";
      return [b.userName, b.netBalance.toFixed(2), status];
    });

    const safeName = groupName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "group";
    downloadCsv(`${safeName}-balances.csv`, ["Member", `Net balance (${code})`, "Status"], rows);
  }

  return (
    <div>
      {balances !== null && balances.length > 0 && (
        <>
          {balanceSummary !== null && Math.abs(balanceSummary) > 0.004 && (
            <div
              className={`mb-4 rounded-2xl px-4 py-3.5 ${
                balanceSummary > 0 ? "bg-positive/10" : "bg-negative/10"
              }`}
            >
              <p className="font-sans text-sm text-ink">
                {balanceSummary > 0 ? (
                  <>
                    Overall, you&rsquo;re owed{" "}
                    <span className="font-semibold text-positive">
                      {symbol}{balanceSummary.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>
                    Overall, you owe{" "}
                    <span className="font-semibold text-negative">{symbol}{Math.abs(balanceSummary).toFixed(2)}</span>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="mb-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-full font-sans text-sm font-semibold text-primary transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Export CSV
            </button>
          </div>
        </>
      )}

      {balances === null ? (
        <CardListSkeleton count={3} />
      ) : balances.length === 0 ? (
        <EmptyState title="No balances yet" hint="Balances appear once expenses are added." />
      ) : (
        <ul className="space-y-3">
          {sortedBalances!.map((b) => {
            const isSettled = Math.abs(b.netBalance) < 0.004;
            return (
              <li key={b.userId}>
                <Card
                  className={`border-l-[3px] ${
                    isSettled
                      ? "border-l-border"
                      : b.netBalance > 0
                      ? "border-l-positive"
                      : "border-l-negative"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="block font-sans text-sm font-medium text-ink">{b.userName}</span>
                      <span className="block font-sans text-xs text-ink-muted">
                        {isSettled ? "Settled up" : b.netBalance > 0 ? "Is owed" : "Owes"}
                      </span>
                    </div>
                    <Money amount={b.netBalance} showSign />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
