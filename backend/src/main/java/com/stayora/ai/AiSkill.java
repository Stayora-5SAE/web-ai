package com.stayora.ai;

/** One business-owned prompt and deterministic offline response per team member. */
public interface AiSkill {
  String id();

  String label();

  String owner();

  String systemPrompt();

  String mock(String safeContext);
}
