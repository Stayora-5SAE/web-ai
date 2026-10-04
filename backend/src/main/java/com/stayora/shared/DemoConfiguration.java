package com.stayora.shared;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

@Configuration
public class DemoConfiguration {
  private final Environment environment;
  private final boolean demo;

  public DemoConfiguration(
      Environment environment, @Value("${stayora.demo-enabled:false}") boolean demo) {
    this.environment = environment;
    this.demo = demo;
  }

  @PostConstruct
  void verify() {
    if (!demo
        || !environment.acceptsProfiles(Profiles.of("dev", "test"))
        || java.util.Arrays.stream(environment.getActiveProfiles())
            .anyMatch(p -> !p.equals("dev") && !p.equals("test")))
      throw new IllegalStateException(
          "Real authentication is not implemented. Run locally with the dev profile; demo mode is forbidden outside dev/test.");
  }
}
