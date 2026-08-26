package com.splitwise.repository;

import com.splitwise.entity.ExpenseShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpenseShareRepository extends JpaRepository<ExpenseShare, String> {

    // Used by the balance calculator: all shares for every expense in a group
    List<ExpenseShare> findByExpense_Group_Id(String groupId);

    List<ExpenseShare> findByUserId(String userId);
}
