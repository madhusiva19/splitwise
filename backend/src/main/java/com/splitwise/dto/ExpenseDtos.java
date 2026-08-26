package com.splitwise.dto;

import com.splitwise.entity.SplitType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class ExpenseDtos {

    public record ExpenseShareInput(
            String userId,
            BigDecimal amount
    ) {}

    public record CreateExpenseRequest(
            @NotBlank String description,
            @NotNull @Positive BigDecimal amount,
            @NotNull SplitType splitType,
            @NotEmpty List<String> participantUserIds,
            List<ExpenseShareInput> shares
    ) {}

    public record ExpenseShareResponse(
            String userId,
            String userName,
            BigDecimal shareAmount,
            boolean settled
    ) {}

    public record ExpenseResponse(
            String id,
            String groupId,
            String description,
            BigDecimal amount,
            SplitType splitType,
            String paidByUserId,
            String paidByName,
            Instant createdAt,
            List<ExpenseShareResponse> shares
    ) {}

    public record BalanceResponse(
            String userId,
            String userName,
            BigDecimal netBalance
    ) {}

    public record SettlementSuggestion(
            String fromUserId,
            String fromUserName,
            String toUserId,
            String toUserName,
            BigDecimal amount
    ) {}
}
