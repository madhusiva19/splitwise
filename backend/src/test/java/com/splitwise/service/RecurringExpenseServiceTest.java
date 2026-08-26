package com.splitwise.service;

import com.splitwise.entity.Expense;
import com.splitwise.entity.ExpenseCategory;
import com.splitwise.entity.Group;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.RecurrenceFrequency;
import com.splitwise.entity.RecurringExpenseTemplate;
import com.splitwise.entity.SplitType;
import com.splitwise.entity.User;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.RecurringExpenseTemplateRepository;
import com.splitwise.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// Hits the real (Neon) datasource configured in application.yml — there's no in-memory test
// DB wired up yet. @Transactional rolls every write back at the end of the test so nothing
// written here (user/group/expense/template) is left behind.
@SpringBootTest
@Transactional
class RecurringExpenseServiceTest {

    @Autowired
    private RecurringExpenseService recurringExpenseService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private GroupRepository groupRepository;
    @Autowired
    private GroupMemberRepository groupMemberRepository;
    @Autowired
    private RecurringExpenseTemplateRepository recurringExpenseTemplateRepository;
    @Autowired
    private ExpenseRepository expenseRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void processDueTemplates_createsExpenseAndAdvancesNextRunAt() {
        User payer = userRepository.save(User.builder()
                .name("Test Payer")
                .email("recurring-test-payer-" + System.nanoTime() + "@example.com")
                .passwordHash(passwordEncoder.encode("password"))
                .build());
        User participant = userRepository.save(User.builder()
                .name("Test Participant")
                .email("recurring-test-participant-" + System.nanoTime() + "@example.com")
                .passwordHash(passwordEncoder.encode("password"))
                .build());

        Group group = groupRepository.save(Group.builder()
                .name("Recurring Expense Test Group")
                .createdBy(payer)
                .build());

        groupMemberRepository.save(GroupMember.builder().group(group).user(payer).build());
        groupMemberRepository.save(GroupMember.builder().group(group).user(participant).build());

        // Backdated nextRunAt makes this template immediately "due" without waiting for the
        // hourly @Scheduled job — this is what manual local testing should do instead of
        // waiting an hour or temporarily shortening the cron expression.
        RecurringExpenseTemplate template = recurringExpenseTemplateRepository.save(RecurringExpenseTemplate.builder()
                .group(group)
                .createdBy(payer)
                .paidBy(payer)
                .description("Test Rent")
                .amount(new BigDecimal("100.00"))
                .category(ExpenseCategory.RENT)
                .splitType(SplitType.EQUAL)
                .participantUserIds(new ArrayList<>(List.of(payer.getId(), participant.getId())))
                .frequency(RecurrenceFrequency.MONTHLY)
                .nextRunAt(Instant.now().minus(1, ChronoUnit.MINUTES))
                .active(true)
                .build());

        recurringExpenseService.processDueTemplates();

        List<Expense> groupExpenses = expenseRepository.findByGroupId(group.getId());
        assertThat(groupExpenses).hasSize(1);
        Expense created = groupExpenses.get(0);
        assertThat(created.getDescription()).isEqualTo("Test Rent");
        assertThat(created.getAmount()).isEqualByComparingTo("100.00");
        assertThat(created.getPaidBy().getId()).isEqualTo(payer.getId());

        RecurringExpenseTemplate refreshed = recurringExpenseTemplateRepository.findById(template.getId()).orElseThrow();
        assertThat(refreshed.getNextRunAt()).isAfter(Instant.now());
    }
}
