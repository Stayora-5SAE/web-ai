package com.stayora.shared;

import java.sql.Connection;
import java.time.LocalDate;
import javax.sql.DataSource;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class DevSeeder implements ApplicationRunner {
  private final DataSource dataSource;
  private final JdbcTemplate jdbc;

  public DevSeeder(DataSource dataSource, JdbcTemplate jdbc) {
    this.dataSource = dataSource;
    this.jdbc = jdbc;
  }

  @Override
  public void run(ApplicationArguments args) throws Exception {
    try (Connection connection = dataSource.getConnection()) {
      ScriptUtils.executeSqlScript(connection, new ClassPathResource("dev-seed.sql"));
    }
    LocalDate start = LocalDate.now().withDayOfMonth(1).plusMonths(1).withDayOfMonth(12);
    insert(
        "20000000-0000-0000-0000-000000001026",
        "10000000-0000-0000-0000-000000000001",
        start,
        start.plusDays(3),
        2,
        160,
        35,
        25,
        "CONFIRMED");
    insert(
        "20000000-0000-0000-0000-000000001027",
        "10000000-0000-0000-0000-000000000002",
        start.plusDays(6),
        start.plusDays(10),
        4,
        240,
        0,
        0,
        "PENDING");
    jdbc.update(
        "INSERT INTO stayora.availability_blocks VALUES ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002', ?, ?, 'Owner stay') ON CONFLICT DO NOTHING",
        start.plusDays(12),
        start.plusDays(14));
  }

  private void insert(
      String id,
      String property,
      LocalDate start,
      LocalDate end,
      int guests,
      int nightly,
      int cleaning,
      int service,
      String status) {
    int subtotal = nightly * (int) java.time.temporal.ChronoUnit.DAYS.between(start, end);
    jdbc.update(
        "INSERT INTO stayora.reservations (id,property_id,guest_id,check_in,check_out,guests,nightly_price,subtotal,cleaning_fee,service_fee,total,status,payment_status,created_at) VALUES (?::uuid,?::uuid,'00000000-0000-0000-0000-000000000001',?,?,?,?,?,?,?,?,?,'SIMULATED',now()) ON CONFLICT DO NOTHING",
        id,
        property,
        start,
        end,
        guests,
        nightly,
        subtotal,
        cleaning,
        service,
        subtotal + cleaning + service,
        status);
  }
}
