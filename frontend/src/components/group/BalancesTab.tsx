"use client";

import { useMemo } from "react";
import Card from "@/components/Card";
import Money from "@/components/Money";
import EmptyState from "@/components/EmptyState";
import { CardListSkeleton } from "@/components/Skeleton";
import { downloadCsv } from "@/lib/csv";
import { BalanceResponse } from "@/lib/expenses";

interface BalancesTabProps {
  groupName: string;
  balances: BalanceResponse[] | null;
  currentUserId: string;
}

export default function BalancesTab({ groupName, balances, currentUserId }: BalancesTabProps) {
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
          ? `is owed ₹${b.netBalance.toFixed(2)}`
          : b.netBalance < -0.004
          ? `owes ₹${Math.abs(b.netBalance).toFixed(2)}`
          : "settled up";
      return [b.userName, b.netBalance.toFixed(2), status];
    });

    const safeName = groupName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "group";
    downloadCsv(`${safeName}-balances.csv`, ["Member", "Net balance (INR)", "Status"], rows);
  }

  return (
    <div>
      {balances !== null && balances.length > 0 && (
        <>
          {balanceSummary !== null && Math.abs(balanceSummary) > 0.004 && (
            <div
              className={`mb-4 rounded-sm border px-4 py-3 ${
                balanceSummary > 0
                  ? "border-ledger-green/40 bg-ledger-green/10"
                  : "border-debt/40 bg-debt/10"
              }`}
            >
              <p className="font-sans text-sm text-ink">
                {balanceSummary > 0 ? (
                  <>
                    Overall, you&rsquo;re owed{" "}
                    <span className="font-mono font-bold text-ledger-green">
                      ₹{balanceSummary.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>
                    Overall, you owe{" "}
                    <span className="font-mono font-bold text-debt">₹{Math.abs(balanceSummary).toFixed(2)}</span>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="mb-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-sm font-mono text-sm font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
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
                      ? "border-l-line"
                      : b.netBalance > 0
                      ? "border-l-ledger-green"
                      : "border-l-debt"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="block font-sans text-sm font-medium text-ink">{b.userName}</span>
                      <span className="block font-mono text-[11px] uppercase tracking-wider text-ink/50">
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
