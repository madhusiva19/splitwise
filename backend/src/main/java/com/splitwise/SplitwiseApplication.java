package com.splitwise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // handy later if you add reminder emails / recurring settlement digests
public class SplitwiseApplication {
    public static void main(String[] args) {
        SpringApplication.run(SplitwiseApplication.class, args);
    }
}
