package com.splitwise.dto;

import java.time.Instant;

public class ActivityDtos {

    public enum ActivityType {
        EXPENSE_ADDED,
        SETTLEMENT_RECORDED,
        MEMBER_JOINED
    }

    public record ActivityItem(
            String id,
            ActivityType type,
            String message,
            String actorUserId,
            String actorName,
            Instant occurredAt
    ) {}
}
