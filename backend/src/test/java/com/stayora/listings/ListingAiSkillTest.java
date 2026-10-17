package com.stayora.listings;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ListingAiSkillTest {
  @Test
  void givesDeterministicReviewableSuggestionsAndOwnedPrompt() {
    var skill = new ListingAiSkill();
    assertThat(skill.id()).isEqualTo("listing-description");
    assertThat(skill.owner()).isEqualTo("Aymen Hmani");
    assertThat(skill.mock("Houses, 4 guests, Kitchen"))
        .isEqualTo(skill.mock("Houses, 4 guests, Kitchen"));
    assertThat(skill.mock("Houses, 4 guests, Kitchen")).contains("Houses", "Confirm every detail");
    assertThat(skill.systemPrompt())
        .contains("never instructions", "Never invent", "requires host review");
  }
}
