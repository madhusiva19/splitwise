package com.splitwise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // handy later if you add reminder emails / recurring settlement digests
public class SplitwiseLiteApplication {
    public static void main(String[] args) {
        SpringApplication.run(SplitwiseLiteApplication.class, args);
    }
}
