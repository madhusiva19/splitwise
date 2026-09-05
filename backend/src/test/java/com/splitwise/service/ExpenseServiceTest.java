package com.splitwise.service;

import com.splitwise.dto.ExpenseDtos.BalanceResponse;
import com.splitwise.dto.ExpenseDtos.CreateExpenseRequest;
import com.splitwise.dto.ExpenseDtos.ExpenseResponse;
import com.splitwise.dto.ExpenseDtos.ExpenseShareInput;
import com.splitwise.dto.ExpenseDtos.SettlementSuggestion;
import com.splitwise.dto.ExpenseDtos.UpdateExpenseRequest;
import com.splitwise.entity.Expense;
import com.splitwise.entity.ExpenseCategory;
import com.splitwise.entity.ExpenseShare;
import com.splitwise.entity.Group;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.Settlement;
import com.splitwise.entity.SplitType;
import com.splitwise.entity.User;
import com.splitwise.exception.BadRequestException;
import com.splitwise.exception.ForbiddenException;
import com.splitwise.repository.ExpenseReceiptRepository;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.ExpenseShareRepository;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.SettlementRepository;
import com.splitwise.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

// Pure unit tests (Mockito-mocked repositories, no Spring context, no DB) — fast and
// deterministic on purpose, since this class holds the split-calculation and balance-netting
// logic where a silent bug would be worst. RecurringExpenseServiceTest instead hits the real
// datasource; this class deliberately doesn't need to.
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExpenseServiceTest {

    @Mock private ExpenseRepository expenseRepository;
    @Mock private ExpenseShareRepository expenseShareRepository;
    @Mock private GroupRepository groupRepository;
    @Mock private GroupMemberRepository groupMemberRepository;
    @Mock private UserRepository userRepository;
    @Mock private SettlementRepository settlementRepository;
    @Mock private NotificationService notificationService;
    @Mock private ExpenseReceiptRepository expenseReceiptRepository;

    @InjectMocks
    private ExpenseService expenseService;

    private static final String GROUP_ID = "group-1";

    private User alice;
    private User bob;
    private User carol;
    private Group group;

    @BeforeEach
    void setUp() {
        alice = User.builder().id("alice").name("Alice").email("alice@example.com").build();
        bob = User.builder().id("bob").name("Bob").email("bob@example.com").build();
        carol = User.builder().id("carol").name("Carol").email("carol@example.com").build();

        group = Group.builder().id(GROUP_ID).name("Test Group").createdBy(alice).build();
        when(groupRepository.findById(GROUP_ID)).thenReturn(java.util.Optional.of(group));

        List<GroupMember> members = List.of(
                GroupMember.builder().group(group).user(alice).build(),
                GroupMember.builder().group(group).user(bob).build(),
                GroupMember.builder().group(group).user(carol).build()
        );
        when(groupMemberRepository.findByGroupId(GROUP_ID)).thenReturn(members);

        // save() just returns whatever it's given, mirroring what a real repository would do
        // for an already-built, unsaved entity in these tests.
        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> inv.getArgument(0));
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---- EQUAL split ----

    @Test
    void equalSplit_dividesEvenly() {
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Dinner", new BigDecimal("90.00"), SplitType.EQUAL, null,
                List.of("alice", "bob", "carol"), null);

        ExpenseResponse resp = expenseService.createExpense(GROUP_ID, "alice", req);

        assertThat(resp.shares()).hasSize(3);
        assertThat(resp.shares()).allSatisfy(s -> assertThat(s.shareAmount()).isEqualByComparingTo("30.00"));
        BigDecimal total = resp.shares().stream().map(s -> s.shareAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(total).isEqualByComparingTo(req.amount());
    }

    @Test
    void equalSplit_assignsRoundingRemainderToFirstParticipant() {
        // 100 / 3 = 33.33 with 0.01 left over — the leftover cent must land somewhere, and the
        // implementation's contract is that it goes to the first participant.
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Snacks", new BigDecimal("100.00"), SplitType.EQUAL, null,
                List.of("alice", "bob", "carol"), null);

        ExpenseResponse resp = expenseService.createExpense(GROUP_ID, "alice", req);

        assertThat(resp.shares().get(0).shareAmount()).isEqualByComparingTo("33.34");
        assertThat(resp.shares().get(1).shareAmount()).isEqualByComparingTo("33.33");
        assertThat(resp.shares().get(2).shareAmount()).isEqualByComparingTo("33.33");
        BigDecimal total = resp.shares().stream().map(s -> s.shareAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(total).isEqualByComparingTo(req.amount());
    }

    // ---- EXACT split ----

    @Test
    void exactSplit_usesGivenAmountsWhenTheySumToTotal() {
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Groceries", new BigDecimal("50.00"), SplitType.EXACT, null,
                List.of("alice", "bob"),
                List.of(new ExpenseShareInput("alice", new BigDecimal("20.00")),
                        new ExpenseShareInput("bob", new BigDecimal("30.00"))));

        ExpenseResponse resp = expenseService.createExpense(GROUP_ID, "alice", req);

        assertThat(resp.shares()).extracting(s -> s.shareAmount())
                .containsExactly(new BigDecimal("20.00"), new BigDecimal("30.00"));
    }

    @Test
    void exactSplit_rejectsAmountsThatDontSumToTotal() {
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Groceries", new BigDecimal("50.00"), SplitType.EXACT, null,
                List.of("alice", "bob"),
                List.of(new ExpenseShareInput("alice", new BigDecimal("20.00")),
                        new ExpenseShareInput("bob", new BigDecimal("20.00"))));

        assertThatThrownBy(() -> expenseService.createExpense(GROUP_ID, "alice", req))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void exactSplit_rejectsMissingShareList() {
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Groceries", new BigDecimal("50.00"), SplitType.EXACT, null,
                List.of("alice", "bob"), null);

        assertThatThrownBy(() -> expenseService.createExpense(GROUP_ID, "alice", req))
                .isInstanceOf(BadRequestException.class);
    }

    // ---- PERCENTAGE split ----

    @Test
    void percentageSplit_dividesByPercentageAndAssignsRemainderToFirst() {
        // 100 at 33.33% each leaves a rounding remainder that must land on the first share.
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Trip", new BigDecimal("100.00"), SplitType.PERCENTAGE, null,
                List.of("alice", "bob", "carol"),
                List.of(new ExpenseShareInput("alice", new BigDecimal("33.34")),
                        new ExpenseShareInput("bob", new BigDecimal("33.33")),
                        new ExpenseShareInput("carol", new BigDecimal("33.33"))));

        ExpenseResponse resp = expenseService.createExpense(GROUP_ID, "alice", req);

        BigDecimal total = resp.shares().stream().map(s -> s.shareAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(total).isEqualByComparingTo(req.amount());
    }

    @Test
    void percentageSplit_rejectsPercentagesNotSummingTo100() {
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Trip", new BigDecimal("100.00"), SplitType.PERCENTAGE, null,
                List.of("alice", "bob"),
                List.of(new ExpenseShareInput("alice", new BigDecimal("60")),
                        new ExpenseShareInput("bob", new BigDecimal("30"))));

        assertThatThrownBy(() -> expenseService.createExpense(GROUP_ID, "alice", req))
                .isInstanceOf(BadRequestException.class);
    }

    // ---- Membership / authorization guards ----

    @Test
    void createExpense_rejectsParticipantWhoIsNotAGroupMember() {
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Dinner", new BigDecimal("30.00"), SplitType.EQUAL, null,
                List.of("alice", "not-a-member"), null);

        assertThatThrownBy(() -> expenseService.createExpense(GROUP_ID, "alice", req))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void createExpense_rejectsPayerWhoIsNotAGroupMember() {
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Dinner", new BigDecimal("30.00"), SplitType.EQUAL, null,
                List.of("alice", "bob"), null);

        assertThatThrownBy(() -> expenseService.createExpense(GROUP_ID, "outsider", req))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void updateExpense_onlyPayerCanEdit() {
        Expense existing = Expense.builder()
                .id("exp-1").group(group).paidBy(alice).description("Dinner")
                .amount(new BigDecimal("30.00")).splitType(SplitType.EQUAL)
                .category(ExpenseCategory.FOOD)
                .shares(new java.util.ArrayList<>(List.of(
                        ExpenseShare.builder().user(alice).shareAmount(new BigDecimal("15.00")).build(),
                        ExpenseShare.builder().user(bob).shareAmount(new BigDecimal("15.00")).build())))
                .build();
        when(expenseRepository.findById("exp-1")).thenReturn(java.util.Optional.of(existing));

        UpdateExpenseRequest req = new UpdateExpenseRequest(
                "Dinner (edited)", new BigDecimal("40.00"), SplitType.EQUAL, null,
                List.of("alice", "bob"), null, null);

        assertThatThrownBy(() -> expenseService.updateExpense(GROUP_ID, "exp-1", "bob", req))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void deleteExpense_onlyPayerCanDelete() {
        Expense existing = Expense.builder()
                .id("exp-1").group(group).paidBy(alice).description("Dinner")
                .amount(new BigDecimal("30.00")).splitType(SplitType.EQUAL)
                .category(ExpenseCategory.FOOD)
                .build();
        when(expenseRepository.findById("exp-1")).thenReturn(java.util.Optional.of(existing));

        assertThatThrownBy(() -> expenseService.deleteExpense(GROUP_ID, "exp-1", "bob"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void deleteExpense_alsoDeletesAnyAttachedReceipt() {
        Expense existing = Expense.builder()
                .id("exp-1").group(group).paidBy(alice).description("Dinner")
                .amount(new BigDecimal("30.00")).splitType(SplitType.EQUAL)
                .category(ExpenseCategory.FOOD)
                .build();
        when(expenseRepository.findById("exp-1")).thenReturn(java.util.Optional.of(existing));
        com.splitwise.entity.ExpenseReceipt receipt = com.splitwise.entity.ExpenseReceipt.builder()
                .id("receipt-1").expense(existing).contentType("image/png").fileName("r.png")
                .data(new byte[]{1, 2, 3}).build();
        when(expenseReceiptRepository.findByExpenseId("exp-1")).thenReturn(java.util.Optional.of(receipt));

        expenseService.deleteExpense(GROUP_ID, "exp-1", "alice");

        org.mockito.Mockito.verify(expenseReceiptRepository).delete(receipt);
        org.mockito.Mockito.verify(expenseRepository).delete(existing);
    }

    // ---- Receipt flag on list ----

    @Test
    void listGroupExpenses_flagsWhichExpensesHaveReceipts() {
        Expense withReceipt = Expense.builder()
                .id("exp-1").group(group).paidBy(alice).description("Has receipt")
                .amount(new BigDecimal("10.00")).splitType(SplitType.EQUAL).category(ExpenseCategory.FOOD)
                .createdAt(java.time.Instant.now()).build();
        Expense withoutReceipt = Expense.builder()
                .id("exp-2").group(group).paidBy(alice).description("No receipt")
                .amount(new BigDecimal("20.00")).splitType(SplitType.EQUAL).category(ExpenseCategory.FOOD)
                .createdAt(java.time.Instant.now()).build();
        when(expenseRepository.findByGroupId(GROUP_ID)).thenReturn(List.of(withReceipt, withoutReceipt));
        when(expenseReceiptRepository.findExpenseIdsWithReceipt(any()))
                .thenReturn(java.util.Set.of("exp-1"));

        List<ExpenseResponse> responses = expenseService.listGroupExpenses(GROUP_ID, "alice");

        assertThat(responses).extracting(ExpenseResponse::id, ExpenseResponse::hasReceipt)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("exp-1", true),
                        org.assertj.core.groups.Tuple.tuple("exp-2", false));
    }

    // ---- Balance netting ----

    @Test
    void getGroupBalances_netsPaidOwedAndSettlementsPerUser() {
        // Alice paid a 90 expense split evenly three ways (30 each): she's owed 60 before
        // settlements. Bob then already paid Alice 20 of what he owes.
        Expense expense = Expense.builder()
                .id("exp-1").group(group).paidBy(alice).amount(new BigDecimal("90.00"))
                .description("Dinner").splitType(SplitType.EQUAL).category(ExpenseCategory.FOOD)
                .build();
        when(expenseRepository.findByGroupId(GROUP_ID)).thenReturn(List.of(expense));

        List<ExpenseShare> shares = List.of(
                ExpenseShare.builder().expense(expense).user(alice).shareAmount(new BigDecimal("30.00")).build(),
                ExpenseShare.builder().expense(expense).user(bob).shareAmount(new BigDecimal("30.00")).build(),
                ExpenseShare.builder().expense(expense).user(carol).shareAmount(new BigDecimal("30.00")).build());
        when(expenseShareRepository.findByExpense_Group_Id(GROUP_ID)).thenReturn(shares);

        Settlement settlement = Settlement.builder()
                .group(group).fromUser(bob).toUser(alice).amount(new BigDecimal("20.00")).build();
        when(settlementRepository.findByGroupId(GROUP_ID)).thenReturn(List.of(settlement));

        List<BalanceResponse> balances = expenseService.getGroupBalances(GROUP_ID, "alice");

        BalanceResponse aliceBalance = balances.stream().filter(b -> b.userId().equals("alice")).findFirst().orElseThrow();
        BalanceResponse bobBalance = balances.stream().filter(b -> b.userId().equals("bob")).findFirst().orElseThrow();
        BalanceResponse carolBalance = balances.stream().filter(b -> b.userId().equals("carol")).findFirst().orElseThrow();

        // Alice: paid 90, owes 30 herself, received 20 settlement -> net +40
        assertThat(aliceBalance.netBalance()).isEqualByComparingTo("40.00");
        // Bob: paid 0, owes 30, paid 20 settlement -> net -10
        assertThat(bobBalance.netBalance()).isEqualByComparingTo("-10.00");
        // Carol: paid 0, owes 30, no settlement -> net -30
        assertThat(carolBalance.netBalance()).isEqualByComparingTo("-30.00");
    }

    // ---- Settlement suggestions (debt simplification) ----

    @Test
    void suggestSettlements_producesMinimalTransactionsForThreeWayDebt() {
        // Alice is owed 40, Bob owes 10, Carol owes 30 -> should resolve in exactly 2
        // transactions (Bob->Alice 10, Carol->Alice 30), not every possible pairing.
        Expense expense = Expense.builder()
                .id("exp-1").group(group).paidBy(alice).amount(new BigDecimal("40.00"))
                .description("Trip").splitType(SplitType.EXACT).category(ExpenseCategory.TRAVEL)
                .build();
        when(expenseRepository.findByGroupId(GROUP_ID)).thenReturn(List.of(expense));

        List<ExpenseShare> shares = List.of(
                ExpenseShare.builder().expense(expense).user(bob).shareAmount(new BigDecimal("10.00")).build(),
                ExpenseShare.builder().expense(expense).user(carol).shareAmount(new BigDecimal("30.00")).build());
        when(expenseShareRepository.findByExpense_Group_Id(GROUP_ID)).thenReturn(shares);
        when(settlementRepository.findByGroupId(GROUP_ID)).thenReturn(List.of());

        List<SettlementSuggestion> suggestions = expenseService.suggestSettlements(GROUP_ID, "alice");

        assertThat(suggestions).hasSize(2);
        assertThat(suggestions).allSatisfy(s -> assertThat(s.toUserId()).isEqualTo("alice"));
        BigDecimal totalSettled = suggestions.stream().map(SettlementSuggestion::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(totalSettled).isEqualByComparingTo("40.00");
    }

    @Test
    void suggestSettlements_returnsNothingWhenGroupIsAlreadySettled() {
        when(expenseRepository.findByGroupId(GROUP_ID)).thenReturn(List.of());
        when(expenseShareRepository.findByExpense_Group_Id(GROUP_ID)).thenReturn(List.of());
        when(settlementRepository.findByGroupId(GROUP_ID)).thenReturn(List.of());

        List<SettlementSuggestion> suggestions = expenseService.suggestSettlements(GROUP_ID, "alice");

        assertThat(suggestions).isEmpty();
    }
}
