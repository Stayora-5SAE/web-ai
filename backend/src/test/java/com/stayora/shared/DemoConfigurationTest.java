package com.stayora.shared;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class DemoConfigurationTest {
  @Test
  void rejectsNonDevelopmentStartup() {
    MockEnvironment env = new MockEnvironment();
    env.setActiveProfiles("production");
    assertThatThrownBy(() -> new DemoConfiguration(env, true).verify())
        .isInstanceOf(IllegalStateException.class);
    assertThatCode(() -> new DemoConfiguration(env, false).verify()).doesNotThrowAnyException();
  }

  @Test
  void acceptsExplicitLocalDemoProfile() {
    MockEnvironment env = new MockEnvironment();
    env.setActiveProfiles("dev");
    assertThatCode(() -> new DemoConfiguration(env, true).verify()).doesNotThrowAnyException();
  }
}
