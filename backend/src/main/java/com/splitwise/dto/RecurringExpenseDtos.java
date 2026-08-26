package com.splitwise.dto;

import com.splitwise.entity.ExpenseCategory;
import com.splitwise.entity.RecurrenceFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class RecurringExpenseDtos {

    public record CreateRecurringExpenseRequest(
            @NotBlank String description,
            @NotNull @Positive BigDecimal amount,
            ExpenseCategory category,
            @NotEmpty List<String> participantUserIds,
            @NotNull RecurrenceFrequency frequency
    ) {}

    public record RecurringExpenseResponse(
            String id,
            String groupId,
            String description,
            BigDecimal amount,
            ExpenseCategory category,
            RecurrenceFrequency frequency,
            List<String> participantUserIds,
            Instant nextRunAt,
            boolean active,
            Instant createdAt,
            String createdByUserId
    ) {}
}
