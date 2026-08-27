package com.splitwise.service;

import com.splitwise.dto.ExpenseDtos.CreateExpenseRequest;
import com.splitwise.dto.RecurringExpenseDtos.CreateRecurringExpenseRequest;
import com.splitwise.dto.RecurringExpenseDtos.RecurringExpenseResponse;
import com.splitwise.entity.ExpenseCategory;
import com.splitwise.entity.Group;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.NotificationType;
import com.splitwise.entity.RecurrenceFrequency;
import com.splitwise.entity.RecurringExpenseTemplate;
import com.splitwise.entity.SplitType;
import com.splitwise.entity.User;
import com.splitwise.exception.BadRequestException;
import com.splitwise.exception.ForbiddenException;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.RecurringExpenseTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecurringExpenseService {

    private static final Logger log = LoggerFactory.getLogger(RecurringExpenseService.class);

    private final RecurringExpenseTemplateRepository recurringExpenseTemplateRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ExpenseService expenseService;
    private final NotificationService notificationService;

    @Transactional
    public RecurringExpenseResponse createTemplate(String groupId, String creatorUserId, CreateRecurringExpenseRequest req) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, creatorUserId);

        Map<String, User> memberUsersById = members.stream()
                .collect(Collectors.toMap(m -> m.getUser().getId(), GroupMember::getUser));

        for (String participantId : req.participantUserIds()) {
            if (!memberUsersById.containsKey(participantId)) {
                throw new BadRequestException("User " + participantId + " is not a member of this group");
            }
        }

        User creator = memberUsersById.get(creatorUserId);

        RecurringExpenseTemplate template = RecurringExpenseTemplate.builder()
                .group(group)
                .createdBy(creator)
                .paidBy(creator)
                .description(req.description())
                .amount(req.amount())
                .category(req.category() != null ? req.category() : ExpenseCategory.OTHER)
                .splitType(SplitType.EQUAL)
                .participantUserIds(new ArrayList<>(req.participantUserIds()))
                .frequency(req.frequency())
                .nextRunAt(computeNextRun(Instant.now(), req.frequency()))
                .active(true)
                .build();

        template = recurringExpenseTemplateRepository.save(template);

        return toResponse(template);
    }

    @Transactional(readOnly = true)
    public List<RecurringExpenseResponse> listTemplates(String groupId, String requesterUserId) {
        groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        requireMembership(members, requesterUserId);

        return recurringExpenseTemplateRepository.findByGroupId(groupId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deactivateTemplate(String templateId, String requesterUserId) {
        RecurringExpenseTemplate template = recurringExpenseTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring expense not found"));

        if (!template.getCreatedBy().getId().equals(requesterUserId)) {
            throw new ForbiddenException("Only the creator can deactivate this recurring expense");
        }

        template.setActive(false);
        recurringExpenseTemplateRepository.save(template);
    }

    @Transactional
    public void processDueTemplates() {
        List<RecurringExpenseTemplate> dueTemplates =
                recurringExpenseTemplateRepository.findByActiveTrueAndNextRunAtBefore(Instant.now());

        int createdCount = 0;
        for (RecurringExpenseTemplate template : dueTemplates) {
            CreateExpenseRequest expenseRequest = new CreateExpenseRequest(
                    template.getDescription(),
                    template.getAmount(),
                    template.getSplitType(),
                    template.getCategory(),
                    template.getParticipantUserIds(),
                    null
            );

            expenseService.createExpense(template.getGroup().getId(), template.getPaidBy().getId(), expenseRequest);
            createdCount++;

            try {
                String paidByUserId = template.getPaidBy().getId();
                for (String participantId : template.getParticipantUserIds()) {
                    if (!participantId.equals(paidByUserId)) {
                        notificationService.notify(participantId, NotificationType.RECURRING_EXPENSE_CREATED,
                                "Recurring expense auto-added: " + template.getDescription() + " (₹" + template.getAmount() + ")",
                                template.getGroup().getId());
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to send RECURRING_EXPENSE_CREATED notifications for template {}", template.getId(), e);
            }

            template.setNextRunAt(computeNextRun(template.getNextRunAt(), template.getFrequency()));
            recurringExpenseTemplateRepository.save(template);
        }

        log.info("Recurring expense job: auto-created {} expense(s) from {} due template(s)", createdCount, dueTemplates.size());
    }

    private Instant computeNextRun(Instant from, RecurrenceFrequency frequency) {
        return switch (frequency) {
            case WEEKLY -> from.plus(7, ChronoUnit.DAYS);
            case MONTHLY -> from.atZone(ZoneOffset.UTC).plusMonths(1).toInstant();
        };
    }

    private void requireMembership(List<GroupMember> members, String userId) {
        boolean isMember = members.stream().anyMatch(m -> m.getUser().getId().equals(userId));
        if (!isMember) {
            throw new ForbiddenException("You're not a member of this group");
        }
    }

    private RecurringExpenseResponse toResponse(RecurringExpenseTemplate template) {
        return new RecurringExpenseResponse(
                template.getId(),
                template.getGroup().getId(),
                template.getDescription(),
                template.getAmount(),
                template.getCategory(),
                template.getFrequency(),
                template.getParticipantUserIds(),
                template.getNextRunAt(),
                template.isActive(),
                template.getCreatedAt(),
                template.getCreatedBy().getId()
        );
    }
}
