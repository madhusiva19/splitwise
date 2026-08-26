package com.splitwise.repository;

import com.splitwise.entity.RecurringExpenseTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface RecurringExpenseTemplateRepository extends JpaRepository<RecurringExpenseTemplate, String> {
    List<RecurringExpenseTemplate> findByGroupId(String groupId);
    List<RecurringExpenseTemplate> findByActiveTrueAndNextRunAtBefore(Instant cutoff);
}
