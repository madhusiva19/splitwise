package com.splitwise.repository;

import com.splitwise.entity.Notification;
import com.splitwise.entity.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(String userId);
    long countByRecipientIdAndReadFalse(String userId);
    List<Notification> findByGroupId(String groupId);

    // Used by the settle-up digest to avoid re-nudging a user for the same stale balance —
    // "since" is the group's last-activity timestamp, so a nudge sent before that point doesn't
    // count and a fresh one is sent once the group goes stale again after new activity.
    boolean existsByRecipientIdAndGroupIdAndTypeAndCreatedAtAfter(
            String recipientId, String groupId, NotificationType type, Instant since);
}
