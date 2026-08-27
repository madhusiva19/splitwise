package com.splitwise.dto;

import com.splitwise.entity.NotificationType;

import java.time.Instant;

public class NotificationDtos {

    public record NotificationResponse(
            String id,
            NotificationType type,
            String message,
            String groupId,
            boolean read,
            Instant createdAt
    ) {}

    public record UnreadCountResponse(
            long count
    ) {}
}
