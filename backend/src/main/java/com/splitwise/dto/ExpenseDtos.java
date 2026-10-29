package com.splitwise.dto;

import com.splitwise.entity.ExpenseCategory;
import com.splitwise.entity.SplitType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class ExpenseDtos {

    public record ExpenseShareInput(
            @NotBlank String userId,
            // Zero is allowed (e.g. a participant included with no share), negative is not.
            @NotNull @PositiveOrZero BigDecimal amount
    ) {}

    public record CreateExpenseRequest(
            @NotBlank String description,
            @NotNull @Positive BigDecimal amount,
            @NotNull SplitType splitType,
            ExpenseCategory category,
            @NotEmpty List<String> participantUserIds,
            @Valid List<ExpenseShareInput> shares
    ) {}

    public record UpdateExpenseRequest(
            @NotBlank String description,
            @NotNull @Positive BigDecimal amount,
            @NotNull SplitType splitType,
            ExpenseCategory category,
            @NotEmpty List<String> participantUserIds,
            @Valid List<ExpenseShareInput> shares,
            // Optional — omit to keep the existing payer, or set to reassign who paid.
            String paidByUserId
    ) {}

    public record ExpenseShareResponse(
            String userId,
            String userName,
            BigDecimal shareAmount
    ) {}

    public record ExpenseResponse(
            String id,
            String groupId,
            String description,
            BigDecimal amount,
            SplitType splitType,
            ExpenseCategory category,
            String paidByUserId,
            String paidByName,
            Instant createdAt,
            boolean hasReceipt,
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

    public record RecordSettlementRequest(
            @NotBlank String toUserId,
            @NotNull @Positive BigDecimal amount
    ) {}

    public record RemindSettlementRequest(
            @NotBlank String toUserId,
            @NotNull @Positive BigDecimal amount
    ) {}

    public record SettlementResponse(
            String id,
            String groupId,
            String fromUserId,
            String fromUserName,
            String toUserId,
            String toUserName,
            BigDecimal amount,
            Instant settledAt
    ) {}

    public record CategoryBreakdown(
            ExpenseCategory category,
            BigDecimal totalAmount,
            int expenseCount
    ) {}

    public record MonthlySpendPoint(
            String month, // "YYYY-MM"
            BigDecimal totalAmount
    ) {}

    public record CategoryTrend(
            ExpenseCategory category,
            BigDecimal currentMonthAmount,
            BigDecimal previousMonthAmount,
            // null when previousMonthAmount is zero and currentMonthAmount isn't — "up X%" is
            // undefined from a zero base, so the frontend renders that case as "new this month".
            Double percentChange
    ) {}

    public record SpendingTrendResponse(
            List<MonthlySpendPoint> monthlyTotals,
            List<CategoryTrend> categoryTrends
    ) {}
}
