package com.splitwise.service;

import com.splitwise.dto.ExpenseDtos.BalanceResponse;
import com.splitwise.entity.Expense;
import com.splitwise.entity.ExpenseCategory;
import com.splitwise.entity.Group;
import com.splitwise.entity.NotificationType;
import com.splitwise.entity.SplitType;
import com.splitwise.entity.User;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.NotificationRepository;
import com.splitwise.repository.SettlementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SettleUpDigestServiceTest {

    @Mock private GroupRepository groupRepository;
    @Mock private ExpenseRepository expenseRepository;
    @Mock private SettlementRepository settlementRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private ExpenseService expenseService;
    @Mock private NotificationService notificationService;

    private SettleUpDigestService digestService;

    private static final String GROUP_ID = "group-1";
    private Group group;

    @BeforeEach
    void setUp() {
        digestService = new SettleUpDigestService(
                groupRepository, expenseRepository, settlementRepository,
                notificationRepository, expenseService, notificationService);
        ReflectionTestUtils.setField(digestService, "staleAfterDays", 3);

        User alice = User.builder().id("alice").name("Alice").build();
        group = Group.builder().id(GROUP_ID).name("Trip").createdBy(alice)
                .createdAt(Instant.now().minus(30, ChronoUnit.DAYS)).build();

        when(groupRepository.findAll()).thenReturn(List.of(group));
        when(settlementRepository.findByGroupId(GROUP_ID)).thenReturn(List.of());
    }

    private Expense expenseCreatedAt(Instant createdAt) {
        return Expense.builder().id("exp-1").group(group).amount(new BigDecimal("50.00"))
                .description("Something").splitType(SplitType.EQUAL).category(ExpenseCategory.OTHER)
                .createdAt(createdAt).build();
    }

    @Test
    void skipsGroupsWithRecentActivity() {
        when(expenseRepository.findByGroupId(GROUP_ID)).thenReturn(List.of(expenseCreatedAt(Instant.now())));

        digestService.sendDigests();

        verify(notificationService, never()).notify(anyString(), any(), anyString(), anyString());
    }

    @Test
    void nudgesDebtorsInStaleGroups() {
        when(expenseRepository.findByGroupId(GROUP_ID))
                .thenReturn(List.of(expenseCreatedAt(Instant.now().minus(10, ChronoUnit.DAYS))));
        when(expenseService.getGroupBalances(GROUP_ID))
                .thenReturn(List.of(new BalanceResponse("bob", "Bob", new BigDecimal("-50.00"))));
        when(notificationRepository.existsByRecipientIdAndGroupIdAndTypeAndCreatedAtAfter(
                eq("bob"), eq(GROUP_ID), eq(NotificationType.SETTLE_UP_NUDGE), any())).thenReturn(false);

        digestService.sendDigests();

        verify(notificationService).notify(eq("bob"), eq(NotificationType.SETTLE_UP_NUDGE), anyString(), eq(GROUP_ID));
    }

    @Test
    void skipsUsersAlreadyNudgedSinceLastActivity() {
        when(expenseRepository.findByGroupId(GROUP_ID))
                .thenReturn(List.of(expenseCreatedAt(Instant.now().minus(10, ChronoUnit.DAYS))));
        when(expenseService.getGroupBalances(GROUP_ID))
                .thenReturn(List.of(new BalanceResponse("bob", "Bob", new BigDecimal("-50.00"))));
        when(notificationRepository.existsByRecipientIdAndGroupIdAndTypeAndCreatedAtAfter(
                eq("bob"), eq(GROUP_ID), eq(NotificationType.SETTLE_UP_NUDGE), any())).thenReturn(true);

        digestService.sendDigests();

        verify(notificationService, never()).notify(anyString(), any(), anyString(), anyString());
    }

    @Test
    void skipsCreditorsAndSettledMembers() {
        when(expenseRepository.findByGroupId(GROUP_ID))
                .thenReturn(List.of(expenseCreatedAt(Instant.now().minus(10, ChronoUnit.DAYS))));
        when(expenseService.getGroupBalances(GROUP_ID)).thenReturn(List.of(
                new BalanceResponse("alice", "Alice", new BigDecimal("50.00")), // creditor
                new BalanceResponse("carol", "Carol", BigDecimal.ZERO)));        // settled up

        digestService.sendDigests();

        verify(notificationService, never()).notify(anyString(), any(), anyString(), anyString());
    }
}
