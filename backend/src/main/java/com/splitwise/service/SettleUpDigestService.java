package com.splitwise.service;

import com.splitwise.dto.ExpenseDtos.BalanceResponse;
import com.splitwise.entity.Expense;
import com.splitwise.entity.Group;
import com.splitwise.entity.NotificationType;
import com.splitwise.entity.Settlement;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.NotificationRepository;
import com.splitwise.repository.SettlementRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

// Nudges debtors in groups that have gone quiet — "you owe X, last activity N days ago" — so
// balances don't just sit there forever once people stop actively adding expenses. Runs as a
// scheduled digest rather than on every balance read, since the whole point is staleness over
// time, not a reaction to any single request.
@Service
@RequiredArgsConstructor
public class SettleUpDigestService {

    private static final Logger log = LoggerFactory.getLogger(SettleUpDigestService.class);
    private static final BigDecimal EPSILON = new BigDecimal("0.01");

    private final GroupRepository groupRepository;
    private final ExpenseRepository expenseRepository;
    private final SettlementRepository settlementRepository;
    private final NotificationRepository notificationRepository;
    private final ExpenseService expenseService;
    private final NotificationService notificationService;

    @Value("${app.settle-up-digest.stale-after-days}")
    private int staleAfterDays;

    @Transactional
    public void sendDigests() {
        int nudged = 0;
        for (Group group : groupRepository.findAll()) {
            nudged += processGroup(group);
        }
        log.info("Settle-up digest: sent {} nudge(s)", nudged);
    }

    private int processGroup(Group group) {
        Instant lastActivity = lastActivityAt(group);
        Instant staleThreshold = Instant.now().minus(staleAfterDays, ChronoUnit.DAYS);
        if (lastActivity.isAfter(staleThreshold)) {
            return 0; // group is still active — nothing to nudge about yet
        }

        long daysSinceActivity = ChronoUnit.DAYS.between(lastActivity, Instant.now());
        int nudged = 0;

        for (BalanceResponse balance : expenseService.getGroupBalances(group.getId())) {
            if (!owesMoney(balance)) continue;

            boolean alreadyNudged = notificationRepository.existsByRecipientIdAndGroupIdAndTypeAndCreatedAtAfter(
                    balance.userId(), group.getId(), NotificationType.SETTLE_UP_NUDGE, lastActivity);
            if (alreadyNudged) continue;

            String message = "You owe ₹" + balance.netBalance().abs() + " in " + group.getName()
                    + " — last activity " + daysSinceActivity + "d ago";
            notificationService.notify(balance.userId(), NotificationType.SETTLE_UP_NUDGE, message, group.getId());
            nudged++;
        }
        return nudged;
    }

    private boolean owesMoney(BalanceResponse balance) {
        return balance.netBalance().negate().compareTo(EPSILON) > 0;
    }

    private Instant lastActivityAt(Group group) {
        Instant latest = group.getCreatedAt();
        for (Expense expense : expenseRepository.findByGroupId(group.getId())) {
            if (expense.getCreatedAt().isAfter(latest)) latest = expense.getCreatedAt();
        }
        for (Settlement settlement : settlementRepository.findByGroupId(group.getId())) {
            if (settlement.getSettledAt().isAfter(latest)) latest = settlement.getSettledAt();
        }
        return latest;
    }
}
