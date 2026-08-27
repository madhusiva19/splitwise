package com.splitwise.repository;

import com.splitwise.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(String userId);
    long countByRecipientIdAndReadFalse(String userId);
}
