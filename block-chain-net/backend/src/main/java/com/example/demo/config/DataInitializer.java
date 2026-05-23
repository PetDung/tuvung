package com.example.demo.config;

import com.example.demo.entity.User;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final List<UserAccount> DEFAULT_ACCOUNTS = List.of(
            new UserAccount("farmer1", "farmer1@agritrace.com", "password123", UserRole.FARMER, "Farmer One"),
            new UserAccount("farmer2", "farmer2@agritrace.com", "password123", UserRole.FARMER, "Farmer Two"),
            new UserAccount("inspector1", "inspector1@agritrace.com", "password123", UserRole.INSPECTOR, "Inspector One"),
            new UserAccount("inspector2", "inspector2@agritrace.com", "password123", UserRole.INSPECTOR, "Inspector Two"),
            new UserAccount("distributor1", "distributor1@agritrace.com", "password123", UserRole.DISTRIBUTOR, "Distributor One"),
            new UserAccount("distributor2", "distributor2@agritrace.com", "password123", UserRole.DISTRIBUTOR, "Distributor Two"),
            new UserAccount("retailer1", "retailer1@agritrace.com", "password123", UserRole.RETAILER, "Retailer One"),
            new UserAccount("retailer2", "retailer2@agritrace.com", "password123", UserRole.RETAILER, "Retailer Two"),
            new UserAccount("admin", "admin@agritrace.com", "admin123", UserRole.ADMIN, "System Administrator")
    );

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Initializing default test accounts...");

        int created = 0;
        int skipped = 0;

        for (UserAccount account : DEFAULT_ACCOUNTS) {
            if (userRepository.existsByUsername(account.username())) {
                log.debug("User '{}' already exists, skipping", account.username());
                skipped++;
                continue;
            }

            User user = User.builder()
                    .username(account.username())
                    .email(account.email())
                    .password(passwordEncoder.encode(account.password()))
                    .role(account.role())
                    .fullName(account.fullName())
                    .isActive(true)
                    .build();

            userRepository.save(user);
            log.info("Created default user: {} with role {}", account.username(), account.role());
            created++;
        }

        log.info("Data initialization complete. Created: {}, Skipped: {}", created, skipped);
    }

    private record UserAccount(
            String username,
            String email,
            String password,
            UserRole role,
            String fullName
    ) {}
}
