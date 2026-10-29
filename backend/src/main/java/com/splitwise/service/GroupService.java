package com.splitwise.service;

import com.splitwise.dto.ExpenseDtos.BalanceResponse;
import com.splitwise.dto.GroupDtos.*;
import com.splitwise.entity.Currency;
import com.splitwise.entity.Expense;
import com.splitwise.entity.Group;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.NotificationType;
import com.splitwise.entity.User;
import com.splitwise.exception.BadRequestException;
import com.splitwise.exception.ForbiddenException;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.repository.ExpenseReceiptRepository;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.NotificationRepository;
import com.splitwise.repository.RecurringExpenseTemplateRepository;
import com.splitwise.repository.SettlementRepository;
import com.splitwise.repository.UserRepository;
import com.splitwise.util.ValidationUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GroupService {

    private static final Logger log = LoggerFactory.getLogger(GroupService.class);

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ExpenseRepository expenseRepository;
    private final SettlementRepository settlementRepository;
    private final RecurringExpenseTemplateRepository recurringExpenseTemplateRepository;
    private final NotificationRepository notificationRepository;
    private final ExpenseService expenseService;
    private final ExpenseReceiptRepository expenseReceiptRepository;

    @Transactional
    public GroupResponse createGroup(String creatorUserId, CreateGroupRequest req) {
        User creator = userRepository.findById(creatorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Group group = Group.builder()
                .name(req.name())
                .createdBy(creator)
                .currency(req.currency() != null ? req.currency() : Currency.INR)
                .build();
        group = groupRepository.save(group);

        GroupMember membership = GroupMember.builder()
                .group(group)
                .user(creator)
                .build();
        membership = groupMemberRepository.save(membership);

        return toGroupResponse(group, List.of(membership));
    }

    @Transactional(readOnly = true)
    public List<GroupSummaryResponse> listMyGroups(String userId) {
        return groupMemberRepository.findByUserId(userId).stream()
                .map(GroupMember::getGroup)
                .map(group -> new GroupSummaryResponse(
                        group.getId(),
                        group.getName(),
                        groupMemberRepository.findByGroupId(group.getId()).size(),
                        group.getCreatedAt(),
                        group.getCurrency(),
                        group.getCurrency().getSymbol()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public GroupResponse getGroup(String groupId, String requesterUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);

        ValidationUtil.requireMembership(members, requesterUserId);

        return toGroupResponse(group, members);
    }

    @Transactional
    public GroupResponse addMember(String groupId, String requesterUserId, AddMemberRequest req) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);

        ValidationUtil.requireMembership(members, requesterUserId);

        User invitee = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new BadRequestException("No account found with this email — they need to sign up first"));

        boolean alreadyMember = members.stream().anyMatch(m -> m.getUser().getId().equals(invitee.getId()));
        if (alreadyMember) {
            throw new BadRequestException("This person is already a member of the group");
        }

        GroupMember membership = GroupMember.builder()
                .group(group)
                .user(invitee)
                .build();
        groupMemberRepository.save(membership);

        User adder = members.stream()
                .filter(m -> m.getUser().getId().equals(requesterUserId))
                .map(GroupMember::getUser)
                .findFirst()
                .orElse(null);
        String adderName = adder != null ? adder.getName() : "Someone";
        try {
            notificationService.notify(invitee.getId(), NotificationType.ADDED_TO_GROUP,
                    adderName + " added you to " + group.getName(), group.getId());
        } catch (Exception e) {
            log.warn("Failed to send ADDED_TO_GROUP notification for group {}", groupId, e);
        }

        List<GroupMember> updatedMembers = groupMemberRepository.findByGroupId(groupId);
        return toGroupResponse(group, updatedMembers);
    }

    // No cascade is declared at the DB/entity level, so dependent rows are deleted explicitly,
    // children before parents, to avoid FK violations. Using repository.deleteAll(list) (not a
    // bulk delete-by-id query) so JPA still cascades expense shares and recurring-expense
    // participant rows via their owning-entity relationships.
    @Transactional
    public void deleteGroup(String groupId, String requesterUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        if (!group.getCreatedBy().getId().equals(requesterUserId)) {
            throw new ForbiddenException("Only the group creator can delete this group");
        }

        List<Expense> groupExpenses = expenseRepository.findByGroupId(groupId);
        expenseReceiptRepository.deleteAll(expenseReceiptRepository.findByExpenseIdIn(
                groupExpenses.stream().map(Expense::getId).toList()));

        recurringExpenseTemplateRepository.deleteAll(recurringExpenseTemplateRepository.findByGroupId(groupId));
        expenseRepository.deleteAll(groupExpenses);
        settlementRepository.deleteAll(settlementRepository.findByGroupId(groupId));
        notificationRepository.deleteAll(notificationRepository.findByGroupId(groupId));
        groupMemberRepository.deleteAll(groupMemberRepository.findByGroupId(groupId));
        groupRepository.delete(group);
    }

    // A member leaves on their own; the creator must delete the group instead (there's no
    // ownership-transfer flow), and nobody can leave while they still owe or are owed money —
    // otherwise they could dodge a debt just by leaving.
    @Transactional
    public void leaveGroup(String groupId, String requesterUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        ValidationUtil.requireMembership(members, requesterUserId);

        if (group.getCreatedBy().getId().equals(requesterUserId)) {
            throw new BadRequestException("The group creator can't leave — delete the group instead");
        }

        List<BalanceResponse> balances = expenseService.getGroupBalances(groupId, requesterUserId);
        BigDecimal myBalance = balances.stream()
                .filter(b -> b.userId().equals(requesterUserId))
                .map(BalanceResponse::netBalance)
                .findFirst()
                .orElse(BigDecimal.ZERO);
        if (myBalance.abs().compareTo(new BigDecimal("0.01")) >= 0) {
            throw new BadRequestException("You can't leave with an outstanding balance — settle up first");
        }

        GroupMember membership = members.stream()
                .filter(m -> m.getUser().getId().equals(requesterUserId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Membership not found"));
        String leavingUserName = membership.getUser().getName();
        groupMemberRepository.delete(membership);

        for (GroupMember remaining : members) {
            if (remaining.getUser().getId().equals(requesterUserId)) continue;
            try {
                notificationService.notify(remaining.getUser().getId(), NotificationType.MEMBER_LEFT,
                        leavingUserName + " left " + group.getName(), groupId);
            } catch (Exception e) {
                log.warn("Failed to send MEMBER_LEFT notification for group {}", groupId, e);
            }
        }
    }


    private GroupResponse toGroupResponse(Group group, List<GroupMember> members) {
        List<MemberResponse> memberResponses = members.stream()
                .map(m -> new MemberResponse(m.getUser().getId(), m.getUser().getName(), m.getUser().getEmail()))
                .toList();

        return new GroupResponse(
                group.getId(),
                group.getName(),
                group.getCreatedBy().getId(),
                group.getCreatedBy().getName(),
                group.getCreatedAt(),
                group.getCurrency(),
                group.getCurrency().getSymbol(),
                memberResponses
        );
    }
}
