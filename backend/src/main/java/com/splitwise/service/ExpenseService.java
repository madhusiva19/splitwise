package com.splitwise.service;

import com.splitwise.dto.ExpenseDtos.*;
import com.splitwise.entity.Expense;
import com.splitwise.entity.ExpenseCategory;
import com.splitwise.entity.ExpenseShare;
import com.splitwise.entity.Group;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.NotificationType;
import com.splitwise.entity.Settlement;
import com.splitwise.entity.User;
import com.splitwise.exception.BadRequestException;
import com.splitwise.exception.ForbiddenException;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.ExpenseShareRepository;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.SettlementRepository;
import com.splitwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private static final Logger log = LoggerFactory.getLogger(ExpenseService.class);
    private static final BigDecimal EPSILON = new BigDecimal("0.01");

    private final ExpenseRepository expenseRepository;
    private final ExpenseShareRepository expenseShareRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final SettlementRepository settlementRepository;
    private final NotificationService notificationService;

    @Transactional
    public ExpenseResponse createExpense(String groupId, String payerUserId, CreateExpenseRequest req) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, payerUserId);

        Map<String, User> memberUsersById = members.stream()
                .collect(Collectors.toMap(m -> m.getUser().getId(), GroupMember::getUser));

        for (String participantId : req.participantUserIds()) {
            if (!memberUsersById.containsKey(participantId)) {
                throw new BadRequestException("User " + participantId + " is not a member of this group");
            }
        }
        if (req.shares() != null) {
            for (ExpenseShareInput share : req.shares()) {
                if (!memberUsersById.containsKey(share.userId())) {
                    throw new BadRequestException("User " + share.userId() + " is not a member of this group");
                }
            }
        }

        Expense expense = Expense.builder()
                .group(group)
                .paidBy(memberUsersById.get(payerUserId))
                .description(req.description())
                .amount(req.amount())
                .splitType(req.splitType())
                .category(req.category() != null ? req.category() : ExpenseCategory.OTHER)
                .build();

        List<ExpenseShare> shares = switch (req.splitType()) {
            case EQUAL -> buildEqualShares(expense, req.amount(), req.participantUserIds(), memberUsersById);
            case EXACT -> buildExactShares(expense, req.amount(), req.shares(), memberUsersById);
            case PERCENTAGE -> buildPercentageShares(expense, req.amount(), req.shares(), memberUsersById);
        };
        expense.setShares(shares);

        expense = expenseRepository.save(expense);

        String payerName = memberUsersById.get(payerUserId).getName();
        try {
            for (ExpenseShare share : expense.getShares()) {
                String participantId = share.getUser().getId();
                if (!participantId.equals(payerUserId)) {
                    notificationService.notify(participantId, NotificationType.EXPENSE_ADDED,
                            payerName + " added an expense: " + req.description() + " (₹" + req.amount() + ")",
                            groupId);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send EXPENSE_ADDED notifications for expense in group {}", groupId, e);
        }

        return toExpenseResponse(expense);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> listGroupExpenses(String groupId, String requesterUserId) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, requesterUserId);

        return expenseRepository.findByGroupId(groupId).stream()
                .sorted(Comparator.comparing(Expense::getCreatedAt).reversed())
                .map(this::toExpenseResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryBreakdown> getCategoryBreakdown(String groupId, String requesterUserId) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, requesterUserId);

        Map<ExpenseCategory, List<Expense>> byCategory = expenseRepository.findByGroupId(groupId).stream()
                .collect(Collectors.groupingBy(Expense::getCategory));

        return byCategory.entrySet().stream()
                .map(e -> new CategoryBreakdown(
                        e.getKey(),
                        e.getValue().stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
                        e.getValue().size()
                ))
                .sorted(Comparator.comparing(CategoryBreakdown::totalAmount).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BalanceResponse> getGroupBalances(String groupId, String requesterUserId) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, requesterUserId);

        Map<String, BigDecimal> paidByUser = expenseRepository.findByGroupId(groupId).stream()
                .collect(Collectors.groupingBy(e -> e.getPaidBy().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)));

        Map<String, BigDecimal> owedByUser = expenseShareRepository.findByExpense_Group_Id(groupId).stream()
                .collect(Collectors.groupingBy(s -> s.getUser().getId(),
                        Collectors.reducing(BigDecimal.ZERO, ExpenseShare::getShareAmount, BigDecimal::add)));

        List<Settlement> settlements = settlementRepository.findByGroupId(groupId);
        Map<String, BigDecimal> settledPaidByUser = settlements.stream()
                .collect(Collectors.groupingBy(s -> s.getFromUser().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Settlement::getAmount, BigDecimal::add)));
        Map<String, BigDecimal> settledReceivedByUser = settlements.stream()
                .collect(Collectors.groupingBy(s -> s.getToUser().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Settlement::getAmount, BigDecimal::add)));

        return members.stream()
                .map(m -> {
                    String userId = m.getUser().getId();
                    BigDecimal paid = paidByUser.getOrDefault(userId, BigDecimal.ZERO);
                    BigDecimal owed = owedByUser.getOrDefault(userId, BigDecimal.ZERO);
                    BigDecimal settledReceived = settledReceivedByUser.getOrDefault(userId, BigDecimal.ZERO);
                    BigDecimal settledPaid = settledPaidByUser.getOrDefault(userId, BigDecimal.ZERO);
                    BigDecimal netBalance = paid.subtract(owed).subtract(settledReceived).add(settledPaid);
                    return new BalanceResponse(userId, m.getUser().getName(), netBalance);
                })
                .toList();
    }

    @Transactional
    public SettlementResponse recordSettlement(String groupId, String fromUserId, RecordSettlementRequest req) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, fromUserId);
        requireMembership(members, req.toUserId());

        if (fromUserId.equals(req.toUserId())) {
            throw new BadRequestException("You can't record a settlement paying yourself");
        }

        Map<String, User> memberUsersById = members.stream()
                .collect(Collectors.toMap(m -> m.getUser().getId(), GroupMember::getUser));

        Settlement settlement = Settlement.builder()
                .group(group)
                .fromUser(memberUsersById.get(fromUserId))
                .toUser(memberUsersById.get(req.toUserId()))
                .amount(req.amount())
                .build();

        settlement = settlementRepository.save(settlement);

        try {
            String fromUserName = memberUsersById.get(fromUserId).getName();
            notificationService.notify(req.toUserId(), NotificationType.SETTLEMENT_RECORDED,
                    fromUserName + " paid you ₹" + req.amount(), groupId);
        } catch (Exception e) {
            log.warn("Failed to send SETTLEMENT_RECORDED notification for group {}", groupId, e);
        }

        return toSettlementResponse(settlement);
    }

    @Transactional(readOnly = true)
    public List<SettlementResponse> listSettlements(String groupId, String requesterUserId) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, requesterUserId);

        return settlementRepository.findByGroupId(groupId).stream()
                .sorted(Comparator.comparing(Settlement::getSettledAt).reversed())
                .map(this::toSettlementResponse)
                .toList();
    }

    // Greedy debt simplification: each settlement fully clears at least one party's balance
    // (the smaller of the matched creditor/debtor amounts), so the whole group is settled in
    // at most (members - 1) transactions instead of every debtor paying every creditor directly.
    @Transactional(readOnly = true)
    public List<SettlementSuggestion> suggestSettlements(String groupId, String requesterUserId) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, requesterUserId);

        List<BalanceResponse> balances = getGroupBalances(groupId, requesterUserId);

        PriorityQueue<BalanceResponse> creditors = new PriorityQueue<>(
                Comparator.comparing(BalanceResponse::netBalance).reversed());
        PriorityQueue<BalanceResponse> debtors = new PriorityQueue<>(
                Comparator.comparing((BalanceResponse b) -> b.netBalance().abs()).reversed());

        for (BalanceResponse b : balances) {
            if (b.netBalance().compareTo(EPSILON) > 0) {
                creditors.add(b);
            } else if (b.netBalance().negate().compareTo(EPSILON) > 0) {
                debtors.add(b);
            }
        }

        List<SettlementSuggestion> suggestions = new ArrayList<>();
        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            BalanceResponse creditor = creditors.poll();
            BalanceResponse debtor = debtors.poll();

            BigDecimal creditorAmount = creditor.netBalance();
            BigDecimal debtorAmount = debtor.netBalance().abs();
            BigDecimal settleAmount = creditorAmount.min(debtorAmount);

            suggestions.add(new SettlementSuggestion(
                    debtor.userId(), debtor.userName(),
                    creditor.userId(), creditor.userName(),
                    settleAmount
            ));

            BigDecimal creditorRemaining = creditorAmount.subtract(settleAmount);
            BigDecimal debtorRemaining = debtorAmount.subtract(settleAmount);

            if (creditorRemaining.compareTo(EPSILON) > 0) {
                creditors.add(new BalanceResponse(creditor.userId(), creditor.userName(), creditorRemaining));
            }
            if (debtorRemaining.compareTo(EPSILON) > 0) {
                debtors.add(new BalanceResponse(debtor.userId(), debtor.userName(), debtorRemaining.negate()));
            }
        }

        return suggestions;
    }

    // Membership is the gate for all expense/balance access — a non-member can't view or add
    // expenses for a group they don't belong to.
    private void requireMembership(List<GroupMember> members, String userId) {
        boolean isMember = members.stream().anyMatch(m -> m.getUser().getId().equals(userId));
        if (!isMember) {
            throw new ForbiddenException("You're not a member of this group");
        }
    }

    private List<ExpenseShare> buildEqualShares(Expense expense, BigDecimal amount, List<String> participantUserIds,
                                                 Map<String, User> memberUsersById) {
        int count = participantUserIds.size();
        BigDecimal baseShare = amount.divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
        BigDecimal remainder = amount.subtract(baseShare.multiply(BigDecimal.valueOf(count)));

        List<ExpenseShare> shares = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            BigDecimal shareAmount = (i == 0) ? baseShare.add(remainder) : baseShare;
            shares.add(ExpenseShare.builder()
                    .expense(expense)
                    .user(memberUsersById.get(participantUserIds.get(i)))
                    .shareAmount(shareAmount)
                    .build());
        }
        return shares;
    }

    private List<ExpenseShare> buildExactShares(Expense expense, BigDecimal amount, List<ExpenseShareInput> shareInputs,
                                                 Map<String, User> memberUsersById) {
        if (shareInputs == null || shareInputs.isEmpty()) {
            throw new BadRequestException("Exact split requires a list of shares");
        }

        BigDecimal sum = shareInputs.stream().map(ExpenseShareInput::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sum.compareTo(amount) != 0) {
            throw new BadRequestException("Share amounts (" + sum + ") must sum to the expense total (" + amount + ")");
        }

        return shareInputs.stream()
                .map(s -> ExpenseShare.builder()
                        .expense(expense)
                        .user(memberUsersById.get(s.userId()))
                        .shareAmount(s.amount())
                        .build())
                .toList();
    }

    private List<ExpenseShare> buildPercentageShares(Expense expense, BigDecimal amount, List<ExpenseShareInput> shareInputs,
                                                       Map<String, User> memberUsersById) {
        if (shareInputs == null || shareInputs.isEmpty()) {
            throw new BadRequestException("Percentage split requires a list of shares");
        }

        BigDecimal percentSum = shareInputs.stream().map(ExpenseShareInput::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (percentSum.compareTo(BigDecimal.valueOf(100)) != 0) {
            throw new BadRequestException("Percentages (" + percentSum + ") must sum to 100");
        }

        List<BigDecimal> rawShares = shareInputs.stream()
                .map(s -> amount.multiply(s.amount()).divide(BigDecimal.valueOf(100), 2, RoundingMode.DOWN))
                .toList();
        BigDecimal remainder = amount.subtract(rawShares.stream().reduce(BigDecimal.ZERO, BigDecimal::add));

        List<ExpenseShare> shares = new ArrayList<>();
        for (int i = 0; i < shareInputs.size(); i++) {
            BigDecimal shareAmount = (i == 0) ? rawShares.get(i).add(remainder) : rawShares.get(i);
            shares.add(ExpenseShare.builder()
                    .expense(expense)
                    .user(memberUsersById.get(shareInputs.get(i).userId()))
                    .shareAmount(shareAmount)
                    .build());
        }
        return shares;
    }

    private ExpenseResponse toExpenseResponse(Expense expense) {
        List<ExpenseShareResponse> shareResponses = expense.getShares().stream()
                .map(s -> new ExpenseShareResponse(s.getUser().getId(), s.getUser().getName(), s.getShareAmount(), s.isSettled()))
                .toList();

        return new ExpenseResponse(
                expense.getId(),
                expense.getGroup().getId(),
                expense.getDescription(),
                expense.getAmount(),
                expense.getSplitType(),
                expense.getCategory(),
                expense.getPaidBy().getId(),
                expense.getPaidBy().getName(),
                expense.getCreatedAt(),
                shareResponses
        );
    }

    private SettlementResponse toSettlementResponse(Settlement settlement) {
        return new SettlementResponse(
                settlement.getId(),
                settlement.getGroup().getId(),
                settlement.getFromUser().getId(),
                settlement.getFromUser().getName(),
                settlement.getToUser().getId(),
                settlement.getToUser().getName(),
                settlement.getAmount(),
                settlement.getSettledAt()
        );
    }
}
