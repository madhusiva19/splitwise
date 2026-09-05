package com.splitwise.service;

import com.splitwise.entity.Expense;
import com.splitwise.entity.ExpenseReceipt;
import com.splitwise.entity.GroupMember;
import com.splitwise.exception.BadRequestException;
import com.splitwise.exception.ForbiddenException;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.repository.ExpenseReceiptRepository;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Set;

// Storage + display only — no OCR/parsing. Any group member can attach or remove a receipt
// (unlike editing the expense itself, which is payer-only): whoever has the physical receipt
// or photo might not be who paid, so gating this to the payer would just mean asking them to
// do it instead.
@Service
@RequiredArgsConstructor
public class ExpenseReceiptService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;

    public record ReceiptData(byte[] data, String contentType, String fileName) {}

    private final ExpenseReceiptRepository expenseReceiptRepository;
    private final ExpenseRepository expenseRepository;
    private final GroupMemberRepository groupMemberRepository;

    @Transactional
    public void uploadReceipt(String groupId, String expenseId, String requesterUserId, MultipartFile file) {
        Expense expense = requireExpenseInGroup(groupId, expenseId, requesterUserId);

        if (file.isEmpty()) {
            throw new BadRequestException("No file provided");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new BadRequestException("Receipt image must be 5MB or smaller");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Receipt must be a JPEG, PNG, WEBP, or GIF image");
        }

        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Failed to read uploaded file");
        }

        // Replace any existing receipt (the unique constraint on expense_id means an insert
        // would fail otherwise) — "upload" doubles as "replace" from the caller's perspective.
        ExpenseReceipt receipt = expenseReceiptRepository.findByExpenseId(expenseId)
                .orElseGet(() -> ExpenseReceipt.builder().expense(expense).build());
        receipt.setContentType(contentType);
        receipt.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "receipt");
        receipt.setData(data);
        expenseReceiptRepository.save(receipt);
    }

    @Transactional(readOnly = true)
    public ReceiptData getReceipt(String groupId, String expenseId, String requesterUserId) {
        requireExpenseInGroup(groupId, expenseId, requesterUserId);

        ExpenseReceipt receipt = expenseReceiptRepository.findByExpenseId(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("This expense has no receipt"));
        return new ReceiptData(receipt.getData(), receipt.getContentType(), receipt.getFileName());
    }

    @Transactional
    public void deleteReceipt(String groupId, String expenseId, String requesterUserId) {
        requireExpenseInGroup(groupId, expenseId, requesterUserId);

        expenseReceiptRepository.findByExpenseId(expenseId)
                .ifPresent(expenseReceiptRepository::delete);
    }

    private Expense requireExpenseInGroup(String groupId, String expenseId, String requesterUserId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        if (!expense.getGroup().getId().equals(groupId)) {
            throw new ResourceNotFoundException("Expense not found");
        }
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        boolean isMember = members.stream().anyMatch(m -> m.getUser().getId().equals(requesterUserId));
        if (!isMember) {
            throw new ForbiddenException("You're not a member of this group");
        }
        return expense;
    }
}
