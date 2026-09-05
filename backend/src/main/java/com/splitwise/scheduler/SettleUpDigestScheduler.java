package com.splitwise.scheduler;

import com.splitwise.service.SettleUpDigestService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SettleUpDigestScheduler {

    private final SettleUpDigestService settleUpDigestService;

    @Scheduled(cron = "${app.settle-up-digest.cron}")
    public void runSettleUpDigest() {
        settleUpDigestService.sendDigests();
    }
}
