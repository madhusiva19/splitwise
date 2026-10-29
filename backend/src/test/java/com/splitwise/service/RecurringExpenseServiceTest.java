package com.splitwise.service;

import com.splitwise.dto.ExpenseDtos.CreateExpenseRequest;
import com.splitwise.entity.ExpenseCategory;
import com.splitwise.entity.Group;
import com.splitwise.entity.NotificationType;
import com.splitwise.entity.RecurrenceFrequency;
import com.splitwise.entity.RecurringExpenseTemplate;
import com.splitwise.entity.SplitType;
import com.splitwise.entity.User;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.RecurringExpenseTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Pure unit tests (Mockito-mocked collaborators, no Spring context, no DB). The "is it due?"
// filter lives in the repository query (findByActiveTrueAndNextRunAtBefore), so these tests
// control which templates come back as due and verify what the service does with them.
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RecurringExpenseServiceTest {

    @Mock private RecurringExpenseTemplateRepository recurringExpenseTemplateRepository;
    @Mock private GroupRepository groupRepository;
    @Mock private GroupMemberRepository groupMemberRepository;
    @Mock private ExpenseService expenseService;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private RecurringExpenseService recurringExpenseService;

    private static final String GROUP_ID = "group-1";

    private User payer;
    private User participant;
    private Group group;

    @BeforeEach
    void setUp() {
        payer = User.builder().id("payer").name("Payer").email("payer@example.com").build();
        participant = User.builder().id("participant").name("Participant").email("participant@example.com").build();
        group = Group.builder().id(GROUP_ID).name("Test Group").createdBy(payer).build();

        when(recurringExpenseTemplateRepository.save(any(RecurringExpenseTemplate.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private RecurringExpenseTemplate template(String id, RecurrenceFrequency frequency, Instant nextRunAt) {
        return RecurringExpenseTemplate.builder()
                .id(id)
                .group(group)
                .createdBy(payer)
                .paidBy(payer)
                .description("Rent " + id)
                .amount(new BigDecimal("100.00"))
                .category(ExpenseCategory.RENT)
                .splitType(SplitType.EQUAL)
                .participantUserIds(new ArrayList<>(List.of(payer.getId(), participant.getId())))
                .frequency(frequency)
                .nextRunAt(nextRunAt)
                .active(true)
                .build();
    }

    private void dueTemplates(RecurringExpenseTemplate... templates) {
        when(recurringExpenseTemplateRepository.findByActiveTrueAndNextRunAtBefore(any(Instant.class)))
                .thenReturn(List.of(templates));
    }

    @Test
    void processDueTemplates_createsExpenseAndAdvancesNextRunAt() {
        Instant nextRunAt = Instant.now().minus(1, ChronoUnit.MINUTES);
        RecurringExpenseTemplate rent = template("t1", RecurrenceFrequency.MONTHLY, nextRunAt);
        dueTemplates(rent);

        recurringExpenseService.processDueTemplates();

        ArgumentCaptor<CreateExpenseRequest> reqCaptor = ArgumentCaptor.forClass(CreateExpenseRequest.class);
        verify(expenseService).createExpense(eq(GROUP_ID), eq(payer.getId()), reqCaptor.capture());
        CreateExpenseRequest req = reqCaptor.getValue();
        assertThat(req.description()).isEqualTo("Rent t1");
        assertThat(req.amount()).isEqualByComparingTo("100.00");
        assertThat(req.splitType()).isEqualTo(SplitType.EQUAL);
        assertThat(req.category()).isEqualTo(ExpenseCategory.RENT);
        assertThat(req.participantUserIds()).containsExactly(payer.getId(), participant.getId());

        verify(recurringExpenseTemplateRepository).save(rent);
        assertThat(rent.getNextRunAt()).isAfter(Instant.now());
        assertThat(rent.getNextRunAt()).isEqualTo(nextRunAt.atZone(java.time.ZoneOffset.UTC).plusMonths(1).toInstant());
    }

    @Test
    void processDueTemplates_weeklyAdvancesBySevenDays() {
        Instant nextRunAt = Instant.parse("2025-03-03T09:00:00Z");
        RecurringExpenseTemplate weekly = template("t1", RecurrenceFrequency.WEEKLY, nextRunAt);
        dueTemplates(weekly);

        recurringExpenseService.processDueTemplates();

        assertThat(weekly.getNextRunAt()).isEqualTo(Instant.parse("2025-03-10T09:00:00Z"));
    }

    @Test
    void processDueTemplates_monthlyOn31stRollsToLastDayOfShorterMonth() {
        RecurringExpenseTemplate janToFeb = template("t1", RecurrenceFrequency.MONTHLY, Instant.parse("2025-01-31T09:00:00Z"));
        RecurringExpenseTemplate janToLeapFeb = template("t2", RecurrenceFrequency.MONTHLY, Instant.parse("2024-01-31T09:00:00Z"));
        RecurringExpenseTemplate marToApr = template("t3", RecurrenceFrequency.MONTHLY, Instant.parse("2025-03-31T09:00:00Z"));
        dueTemplates(janToFeb, janToLeapFeb, marToApr);

        recurringExpenseService.processDueTemplates();

        assertThat(janToFeb.getNextRunAt()).isEqualTo(Instant.parse("2025-02-28T09:00:00Z"));
        assertThat(janToLeapFeb.getNextRunAt()).isEqualTo(Instant.parse("2024-02-29T09:00:00Z"));
        assertThat(marToApr.getNextRunAt()).isEqualTo(Instant.parse("2025-04-30T09:00:00Z"));
    }

    @Test
    void processDueTemplates_skipsTemplatesNotYetDue() {
        // A template whose nextRunAt is in the future is excluded by the repository query, which
        // the service calls with "now" as the cutoff. Nothing returned -> nothing created or saved.
        dueTemplates();
        Instant before = Instant.now();

        recurringExpenseService.processDueTemplates();

        ArgumentCaptor<Instant> cutoff = ArgumentCaptor.forClass(Instant.class);
        verify(recurringExpenseTemplateRepository).findByActiveTrueAndNextRunAtBefore(cutoff.capture());
        assertThat(cutoff.getValue()).isBetween(before, Instant.now());
        verify(expenseService, never()).createExpense(anyString(), anyString(), any());
        verify(recurringExpenseTemplateRepository, never()).save(any());
    }

    @Test
    void processDueTemplates_notifiesNonPayerParticipantsOnly() {
        dueTemplates(template("t1", RecurrenceFrequency.WEEKLY, Instant.parse("2025-03-03T09:00:00Z")));

        recurringExpenseService.processDueTemplates();

        verify(notificationService).notify(eq(participant.getId()), eq(NotificationType.RECURRING_EXPENSE_CREATED), anyString(), eq(GROUP_ID));
        verify(notificationService, never()).notify(eq(payer.getId()), any(), anyString(), anyString());
    }

    @Test
    void processDueTemplates_notificationFailureDoesNotStopProcessing() {
        // Notification failures are caught per template; expense creation failures are not
        // (they propagate and abort the whole run), so only the former is asserted here.
        RecurringExpenseTemplate first = template("t1", RecurrenceFrequency.WEEKLY, Instant.parse("2025-03-03T09:00:00Z"));
        RecurringExpenseTemplate second = template("t2", RecurrenceFrequency.WEEKLY, Instant.parse("2025-03-04T09:00:00Z"));
        dueTemplates(first, second);
        doThrow(new RuntimeException("SSE down"))
                .when(notificationService).notify(anyString(), any(), anyString(), anyString());

        recurringExpenseService.processDueTemplates();

        verify(expenseService, times(2)).createExpense(eq(GROUP_ID), eq(payer.getId()), any());
        assertThat(first.getNextRunAt()).isEqualTo(Instant.parse("2025-03-10T09:00:00Z"));
        assertThat(second.getNextRunAt()).isEqualTo(Instant.parse("2025-03-11T09:00:00Z"));
    }
}
