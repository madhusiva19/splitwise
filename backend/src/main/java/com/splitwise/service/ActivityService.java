package com.splitwise.service;

import com.splitwise.dto.ActivityDtos.ActivityItem;
import com.splitwise.dto.ActivityDtos.ActivityType;
import com.splitwise.entity.Expense;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.Settlement;
import com.splitwise.exception.ForbiddenException;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.SettlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// There's no dedicated activity-log table; the feed is assembled on read by merging
// member-joined, expense, and settlement records into one timeline sorted by when they happened.
@Service
@RequiredArgsConstructor
public class ActivityService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ExpenseRepository expenseRepository;
    private final SettlementRepository settlementRepository;

    @Transactional(readOnly = true)
    public List<ActivityItem> getGroupActivity(String groupId, String requesterUserId) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, requesterUserId);

        List<ActivityItem> items = new ArrayList<>();

        for (GroupMember member : members) {
            items.add(new ActivityItem(
                    "member-" + member.getId(),
                    ActivityType.MEMBER_JOINED,
                    member.getUser().getName() + " joined the group",
                    member.getUser().getId(),
                    member.getUser().getName(),
                    member.getJoinedAt()
            ));
        }

        for (Expense expense : expenseRepository.findByGroupId(groupId)) {
            items.add(new ActivityItem(
                    "expense-" + expense.getId(),
                    ActivityType.EXPENSE_ADDED,
                    expense.getPaidBy().getName() + " added \"" + expense.getDescription()
                            + "\" (₹" + expense.getAmount() + ")",
                    expense.getPaidBy().getId(),
                    expense.getPaidBy().getName(),
                    expense.getCreatedAt()
            ));
        }

        for (Settlement settlement : settlementRepository.findByGroupId(groupId)) {
            items.add(new ActivityItem(
                    "settlement-" + settlement.getId(),
                    ActivityType.SETTLEMENT_RECORDED,
                    settlement.getFromUser().getName() + " paid " + settlement.getToUser().getName()
                            + " ₹" + settlement.getAmount(),
                    settlement.getFromUser().getId(),
                    settlement.getFromUser().getName(),
                    settlement.getSettledAt()
            ));
        }

        return items.stream()
                .sorted(Comparator.comparing(ActivityItem::occurredAt).reversed())
                .toList();
    }

    private void requireMembership(List<GroupMember> members, String userId) {
        boolean isMember = members.stream().anyMatch(m -> m.getUser().getId().equals(userId));
        if (!isMember) {
            throw new ForbiddenException("You're not a member of this group");
        }
    }
}
