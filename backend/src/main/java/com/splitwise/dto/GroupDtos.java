package com.splitwise.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public class GroupDtos {

    public record CreateGroupRequest(
            @NotBlank String name
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
            List<MemberResponse> members
    ) {}

    public record GroupSummaryResponse(
            String id,
            String name,
            int memberCount,
            Instant createdAt
    ) {}
}
