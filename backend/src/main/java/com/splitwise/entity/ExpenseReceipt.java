package com.splitwise.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

// Stored as bytes in Postgres rather than on local disk — several free-tier hosts (Render,
// Railway, etc.) have ephemeral filesystems, so a disk-backed path would vanish on redeploy.
// Kept as its own table (not columns on Expense) so listing expenses never has to pull image
// bytes along for the ride; a receipt is only loaded when explicitly requested.
@Entity
@Table(name = "expense_receipts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false, unique = true)
    private Expense expense;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    // Deliberately not @Lob: that maps byte[] to Postgres's OID large-object type, meant for
    // huge streamed data. A plain @Column with no @Lob maps to BYTEA instead, which is the
    // right fit for a size-capped (5MB) image loaded fully into memory anyway.
    @Column(nullable = false)
    private byte[] data;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    @PrePersist
    public void prePersist() {
        this.uploadedAt = Instant.now();
    }
}
