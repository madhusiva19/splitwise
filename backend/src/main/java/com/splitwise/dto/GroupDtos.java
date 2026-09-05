package com.splitwise.dto;

import com.splitwise.entity.Currency;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public class GroupDtos {

    public record CreateGroupRequest(
            @NotBlank String name,
            // Optional — defaults to INR. Fixed at creation; there's no currency-change endpoint,
            // since existing expenses would already be in the original currency.
            Currency currency
    ) {}

    public record AddMemberRequest(
            @Email @NotBlank String email
    ) {}

    public record MemberResponse(
            String userId,
            String name,
            String email
    ) {}

    public record GroupResponse(
            String id,
            String name,
            String createdByUserId,
            String createdByName,
            Instant createdAt,
            Currency currency,
            String currencySymbol,
            List<MemberResponse> members
    ) {}

    public record GroupSummaryResponse(
            String id,
            String name,
            int memberCount,
            Instant createdAt,
            Currency currency,
            String currencySymbol
    ) {}
}
