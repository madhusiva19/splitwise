package com.splitwise.scheduler;

import com.splitwise.service.RecurringExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RecurringExpenseScheduler {

    private final RecurringExpenseService recurringExpenseService;

    // Hourly is demo-friendly and keeps this from hammering the DB; a real production system
    // would tune this to the finest-grained frequency it supports (e.g. every few minutes if
    // DAILY recurrences were ever added), or move to an event-driven trigger instead of polling.
    @Scheduled(cron = "0 0 * * * *")
    public void runDueRecurringExpenses() {
        recurringExpenseService.processDueTemplates();
    }
}
