package com.splitwise.service;

import com.splitwise.entity.Expense;
import com.splitwise.entity.ExpenseCategory;
import com.splitwise.entity.ExpenseReceipt;
import com.splitwise.entity.Group;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.SplitType;
import com.splitwise.entity.User;
import com.splitwise.exception.BadRequestException;
import com.splitwise.exception.ForbiddenException;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.repository.ExpenseReceiptRepository;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExpenseReceiptServiceTest {

    @Mock private ExpenseReceiptRepository expenseReceiptRepository;
    @Mock private ExpenseRepository expenseRepository;
    @Mock private GroupMemberRepository groupMemberRepository;

    private ExpenseReceiptService service;

    private static final String GROUP_ID = "group-1";
    private static final String EXPENSE_ID = "exp-1";

    private Expense expense;

    @BeforeEach
    void setUp() {
        service = new ExpenseReceiptService(expenseReceiptRepository, expenseRepository, groupMemberRepository);

        User alice = User.builder().id("alice").name("Alice").build();
        Group group = Group.builder().id(GROUP_ID).name("Trip").createdBy(alice).build();
        expense = Expense.builder()
                .id(EXPENSE_ID).group(group).paidBy(alice).description("Dinner")
                .amount(new BigDecimal("10.00")).splitType(SplitType.EQUAL).category(ExpenseCategory.FOOD)
                .build();

        when(expenseRepository.findById(EXPENSE_ID)).thenReturn(Optional.of(expense));
        when(groupMemberRepository.findByGroupId(GROUP_ID))
                .thenReturn(List.of(GroupMember.builder().group(group).user(alice).build()));
    }

    @Test
    void uploadReceipt_rejectsNonMember() {
        MockMultipartFile file = new MockMultipartFile("file", "r.png", "image/png", new byte[]{1});
        assertThatThrownBy(() -> service.uploadReceipt(GROUP_ID, EXPENSE_ID, "outsider", file))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void uploadReceipt_rejectsExpenseFromAnotherGroup() {
        expense.setGroup(Group.builder().id("other-group").name("Other").createdBy(expense.getPaidBy()).build());
        MockMultipartFile file = new MockMultipartFile("file", "r.png", "image/png", new byte[]{1});
        assertThatThrownBy(() -> service.uploadReceipt(GROUP_ID, EXPENSE_ID, "alice", file))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void uploadReceipt_rejectsDisallowedContentType() {
        MockMultipartFile file = new MockMultipartFile("file", "r.pdf", "application/pdf", new byte[]{1});
        assertThatThrownBy(() -> service.uploadReceipt(GROUP_ID, EXPENSE_ID, "alice", file))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void uploadReceipt_rejectsOversizedFile() {
        byte[] tooBig = new byte[6 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile("file", "r.png", "image/png", tooBig);
        assertThatThrownBy(() -> service.uploadReceipt(GROUP_ID, EXPENSE_ID, "alice", file))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void uploadReceipt_rejectsEmptyFile() {
        MockMultipartFile file = new MockMultipartFile("file", "r.png", "image/png", new byte[0]);
        assertThatThrownBy(() -> service.uploadReceipt(GROUP_ID, EXPENSE_ID, "alice", file))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void uploadReceipt_createsNewReceiptWhenNoneExists() {
        when(expenseReceiptRepository.findByExpenseId(EXPENSE_ID)).thenReturn(Optional.empty());
        byte[] data = {1, 2, 3, 4};
        MockMultipartFile file = new MockMultipartFile("file", "receipt.png", "image/png", data);

        service.uploadReceipt(GROUP_ID, EXPENSE_ID, "alice", file);

        ArgumentCaptor<ExpenseReceipt> captor = ArgumentCaptor.forClass(ExpenseReceipt.class);
        verify(expenseReceiptRepository).save(captor.capture());
        assertThat(captor.getValue().getContentType()).isEqualTo("image/png");
        assertThat(captor.getValue().getFileName()).isEqualTo("receipt.png");
        assertThat(captor.getValue().getData()).isEqualTo(data);
    }

    @Test
    void uploadReceipt_replacesExistingReceiptInPlace() {
        ExpenseReceipt existing = ExpenseReceipt.builder()
                .id("receipt-1").expense(expense).contentType("image/jpeg").fileName("old.jpg")
                .data(new byte[]{9}).build();
        when(expenseReceiptRepository.findByExpenseId(EXPENSE_ID)).thenReturn(Optional.of(existing));
        byte[] newData = {5, 6, 7};
        MockMultipartFile file = new MockMultipartFile("file", "new.png", "image/png", newData);

        service.uploadReceipt(GROUP_ID, EXPENSE_ID, "alice", file);

        ArgumentCaptor<ExpenseReceipt> captor = ArgumentCaptor.forClass(ExpenseReceipt.class);
        verify(expenseReceiptRepository).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo("receipt-1"); // same row, not a new one
        assertThat(captor.getValue().getContentType()).isEqualTo("image/png");
        assertThat(captor.getValue().getData()).isEqualTo(newData);
    }

    @Test
    void getReceipt_throwsWhenNoneExists() {
        when(expenseReceiptRepository.findByExpenseId(EXPENSE_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getReceipt(GROUP_ID, EXPENSE_ID, "alice"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getReceipt_returnsDataWhenPresent() {
        ExpenseReceipt receipt = ExpenseReceipt.builder()
                .id("receipt-1").expense(expense).contentType("image/png").fileName("r.png")
                .data(new byte[]{1, 2}).build();
        when(expenseReceiptRepository.findByExpenseId(EXPENSE_ID)).thenReturn(Optional.of(receipt));

        ExpenseReceiptService.ReceiptData result = service.getReceipt(GROUP_ID, EXPENSE_ID, "alice");

        assertThat(result.contentType()).isEqualTo("image/png");
        assertThat(result.fileName()).isEqualTo("r.png");
        assertThat(result.data()).containsExactly(1, 2);
    }

    @Test
    void deleteReceipt_deletesWhenPresent() {
        ExpenseReceipt receipt = ExpenseReceipt.builder().id("receipt-1").expense(expense).build();
        when(expenseReceiptRepository.findByExpenseId(EXPENSE_ID)).thenReturn(Optional.of(receipt));

        service.deleteReceipt(GROUP_ID, EXPENSE_ID, "alice");

        verify(expenseReceiptRepository).delete(receipt);
    }

    @Test
    void deleteReceipt_isNoOpWhenNoneExists() {
        when(expenseReceiptRepository.findByExpenseId(EXPENSE_ID)).thenReturn(Optional.empty());

        service.deleteReceipt(GROUP_ID, EXPENSE_ID, "alice");

        verify(expenseReceiptRepository, org.mockito.Mockito.never()).delete(any());
    }
}
