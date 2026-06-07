-- Initial MVP schema. SQLAlchemy create_all is the executable initializer for A-02.
-- This file documents the target MySQL shape for later Alembic adoption.

CREATE TABLE users (
  id varchar(36) NOT NULL PRIMARY KEY,
  anonymous_id varchar(64) NOT NULL,
  anonymous_secret_hash varchar(255) NOT NULL,
  created_at datetime(3) NOT NULL,
  updated_at datetime(3) NOT NULL,
  deleted_at datetime(3) NULL,
  UNIQUE KEY uk_users_anonymous_id (anonymous_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scenarios (
  slug varchar(64) NOT NULL PRIMARY KEY,
  name varchar(64) NOT NULL,
  summary varchar(512) NOT NULL,
  estimated_minutes int NOT NULL DEFAULT 5,
  user_role varchar(64) NOT NULL,
  ai_role varchar(64) NOT NULL,
  opening_message text NOT NULL,
  system_prompt text NOT NULL,
  steps_json json NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at datetime(3) NOT NULL,
  updated_at datetime(3) NOT NULL,
  deleted_at datetime(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE practice_sessions (
  id varchar(36) NOT NULL PRIMARY KEY,
  user_id varchar(36) NOT NULL,
  scenario_slug varchar(64) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'in_progress',
  current_step_no int NOT NULL DEFAULT 1,
  ended_at datetime(3) NULL,
  created_at datetime(3) NOT NULL,
  updated_at datetime(3) NOT NULL,
  deleted_at datetime(3) NULL,
  KEY idx_practice_sessions_user_created (user_id, created_at),
  KEY idx_practice_sessions_status_updated (status, updated_at),
  KEY idx_practice_sessions_user_status (user_id, status),
  CONSTRAINT fk_practice_sessions_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_practice_sessions_scenario FOREIGN KEY (scenario_slug) REFERENCES scenarios (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE conversation_turns (
  id varchar(36) NOT NULL PRIMARY KEY,
  session_id varchar(36) NOT NULL,
  turn_index int NOT NULL,
  speaker varchar(16) NOT NULL,
  step_no int NOT NULL DEFAULT 1,
  status varchar(32) NOT NULL DEFAULT 'pending',
  client_turn_id varchar(64) NULL,
  content_text text NOT NULL,
  asr_confidence decimal(5,4) NULL,
  asr_metrics_json json NULL,
  audio_object_key varchar(512) NULL,
  audio_mime_type varchar(128) NULL,
  audio_duration_ms int NULL,
  created_at datetime(3) NOT NULL,
  updated_at datetime(3) NOT NULL,
  deleted_at datetime(3) NULL,
  UNIQUE KEY uk_conversation_turns_session_turn_index (session_id, turn_index),
  UNIQUE KEY uk_conversation_turns_session_client_turn (session_id, client_turn_id),
  KEY idx_conversation_turns_session_speaker (session_id, speaker),
  CONSTRAINT fk_conversation_turns_session FOREIGN KEY (session_id) REFERENCES practice_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE assessment_reports (
  id varchar(36) NOT NULL PRIMARY KEY,
  session_id varchar(36) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'pending',
  overall_score int NULL,
  pronunciation_score int NULL,
  fluency_score int NULL,
  grammar_score int NULL,
  expression_score int NULL,
  level_description varchar(128) NULL,
  one_sentence_summary text NULL,
  feedback_json json NULL,
  error_code varchar(64) NULL,
  error_message varchar(512) NULL,
  created_at datetime(3) NOT NULL,
  updated_at datetime(3) NOT NULL,
  deleted_at datetime(3) NULL,
  UNIQUE KEY uk_assessment_reports_session (session_id),
  KEY idx_assessment_reports_status_updated (status, updated_at),
  CONSTRAINT fk_assessment_reports_session FOREIGN KEY (session_id) REFERENCES practice_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
