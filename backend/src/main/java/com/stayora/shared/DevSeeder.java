package com.stayora.shared;

import java.sql.Connection;
import java.time.LocalDate;
import javax.sql.DataSource;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
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
  @org.springframework.transaction.annotation.Transactional
  public void run(ApplicationArguments args) throws Exception {
    executeScript("dev-seed.sql");
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
    LocalDate completed = LocalDate.now().minusDays(10);
    insert(
        "20000000-0000-0000-0000-000000000091",
        "10000000-0000-0000-0000-000000000001",
        completed,
        completed.plusDays(3),
        2,
        160,
        35,
        25,
        "CONFIRMED");
    insert(
        "20000000-0000-0000-0000-000000000092",
        "10000000-0000-0000-0000-000000000002",
        completed.minusDays(5),
        completed.minusDays(2),
        2,
        240,
        0,
        0,
        "CONFIRMED");
    jdbc.update(
        "INSERT INTO stayora.reviews (id,property_id,author_id,rating,body,reservation_id,subject_id,created_at,updated_at) VALUES ('50000000-0000-0000-0000-000000000092','10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',5,'A peaceful seaside stay with a comfortable space and thoughtful amenities.','20000000-0000-0000-0000-000000000092','00000000-0000-0000-0000-000000000002',now(),now()) ON CONFLICT DO NOTHING");
    executeScript("dev-demo-seed.sql");
    jdbc.update(
        "INSERT INTO stayora.reservation_payments SELECT id,id,total,'TND','SIMULATED',CASE WHEN payment_status='SIMULATED_REFUNDED' THEN 'REFUNDED' ELSE 'CAPTURED' END,'DEMO-'||id::text,created_at,CASE WHEN payment_status='SIMULATED_REFUNDED' THEN created_at ELSE NULL END FROM stayora.reservations ON CONFLICT DO NOTHING");
    jdbc.query("SELECT id FROM stayora.properties ORDER BY id FOR UPDATE", rs -> {});
    jdbc.update(
        "UPDATE stayora.properties p SET rating=COALESCE((SELECT round(avg(r.rating),2) FROM stayora.reviews r WHERE r.property_id=p.id AND r.direction='STAY'),0),review_count=(SELECT count(*) FROM stayora.reviews r WHERE r.property_id=p.id AND r.direction='STAY')");
  }

  private void executeScript(String resource) {
    Connection connection = DataSourceUtils.getConnection(dataSource);
    try {
      ScriptUtils.executeSqlScript(connection, new ClassPathResource(resource));
    } finally {
      DataSourceUtils.releaseConnection(connection, dataSource);
    }
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
