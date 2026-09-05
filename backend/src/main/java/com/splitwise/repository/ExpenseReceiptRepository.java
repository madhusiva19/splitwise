package com.splitwise.repository;

import com.splitwise.entity.ExpenseReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface ExpenseReceiptRepository extends JpaRepository<ExpenseReceipt, String> {
    Optional<ExpenseReceipt> findByExpenseId(String expenseId);
    boolean existsByExpenseId(String expenseId);
    List<ExpenseReceipt> findByExpenseIdIn(List<String> expenseIds);

    // Bulk existence check for the expense list view — avoids one query per expense just to
    // render a "has receipt" flag.
    @Query("select r.expense.id from ExpenseReceipt r where r.expense.id in :expenseIds")
    Set<String> findExpenseIdsWithReceipt(@Param("expenseIds") List<String> expenseIds);
}
