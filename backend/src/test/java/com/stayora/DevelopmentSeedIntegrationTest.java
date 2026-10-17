package com.stayora;

import static org.assertj.core.api.Assertions.assertThat;

import com.stayora.shared.DevSeeder;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DevelopmentSeedIntegrationTest {
  @Autowired DataSource dataSource;
  @Autowired JdbcTemplate jdbc;

  @Test
  void seedsConsistentTwoWayDemoDataAndPreservesEditsOnRepeat() throws Exception {
    assertThat(jdbc.queryForObject("select current_database()", String.class))
        .isEqualTo("stayora_test");
    var seeder = new DevSeeder(dataSource, jdbc);
    seeder.run(null);
    assertThat(count("properties", "id::text like '11000000-%'")).isEqualTo(20);
    assertThat(count("reservations", "id::text like '21000000-%'")).isEqualTo(54);
    assertThat(count("reservations", "id::text like '22000000-%'")).isEqualTo(12);
    assertThat(count("reviews", "id::text like '51000000-%'")).isEqualTo(50);
    assertThat(count("reviews", "id::text like '52000000-%'")).isEqualTo(36);
    assertThat(count("messages", "id::text like '71000000-%' or id::text like '72000000-%'"))
        .isEqualTo(24);
    assertThat(count("reviews", "direction='GUEST' and tags<>''")).isZero();
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.reviews v join stayora.reservations r on r.id=v.reservation_id join stayora.properties p on p.id=r.property_id where v.id::text like '5_000000-%' and (r.status<>'CONFIRMED' or r.check_out>current_date or (v.direction='STAY' and (v.author_id<>r.guest_id or v.subject_id<>p.host_id)) or (v.direction='GUEST' and (v.author_id<>p.host_id or v.subject_id<>r.guest_id)))",
                Long.class))
        .isZero();
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.reservations r left join stayora.reservation_payments p on p.reservation_id=r.id where r.id::text like '2_000000-%' and (p.id is null or p.amount<>r.total or r.total<>r.subtotal+r.cleaning_fee+r.service_fee or (r.payment_status='SIMULATED_REFUNDED' and p.status<>'REFUNDED'))",
                Long.class))
        .isZero();
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.reservations a join stayora.reservations b on a.property_id=b.property_id and a.id<b.id and a.check_in<b.check_out and a.check_out>b.check_in where a.status in ('PENDING','CONFIRMED') and b.status in ('PENDING','CONFIRMED') and a.id::text like '2_000000-%' and b.id::text like '2_000000-%'",
                Long.class))
        .isZero();
    long reviewCount = count("reviews", "true");
    long bookingCount = count("reservations", "true");
    var dates =
        jdbc.queryForMap(
            "select check_in,check_out,created_at from stayora.reservations where id='22000000-0000-0000-0000-000000000001'");
    jdbc.update(
        "update stayora.properties set title='A host-edited title', image_urls='https://example.com/custom.jpg' where id='11000000-0000-0000-0000-000000000001'");
    jdbc.update(
        "update stayora.properties set image_urls='https://lh3.googleusercontent.com/aida-public/custom-owner-image' where id='10000000-0000-0000-0000-000000000001'");
    seeder.run(null);
    assertThat(count("reviews", "true")).isEqualTo(reviewCount);
    assertThat(count("reservations", "true")).isEqualTo(bookingCount);
    assertThat(
            jdbc.queryForMap(
                "select check_in,check_out,created_at from stayora.reservations where id='22000000-0000-0000-0000-000000000001'"))
        .isEqualTo(dates);
    assertThat(
            jdbc.queryForObject(
                "select title from stayora.properties where id='11000000-0000-0000-0000-000000000001'",
                String.class))
        .isEqualTo("A host-edited title");
    assertThat(
            jdbc.queryForObject(
                "select image_urls from stayora.properties where id='10000000-0000-0000-0000-000000000001'",
                String.class))
        .isEqualTo("https://lh3.googleusercontent.com/aida-public/custom-owner-image");
    assertThat(
            jdbc.queryForObject(
                "select count(*) from stayora.properties p where p.rating<>coalesce((select round(avg(rating),2) from stayora.reviews r where r.property_id=p.id and r.direction='STAY'),0) or p.review_count<>(select count(*) from stayora.reviews r where r.property_id=p.id and r.direction='STAY')",
                Long.class))
        .isZero();
  }

  private long count(String table, String condition) {
    return jdbc.queryForObject(
        "select count(*) from stayora." + table + " where " + condition, Long.class);
  }
}
