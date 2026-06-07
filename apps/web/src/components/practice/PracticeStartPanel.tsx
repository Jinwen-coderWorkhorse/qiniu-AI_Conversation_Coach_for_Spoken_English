"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { createPracticeSession, getScenario } from "@/lib/api/endpoints";
import type { ScenarioDetail } from "@/lib/api/contracts";
import {
  authenticateAnonymousIdentity,
  clearAnonymousAccessToken,
  ensureAnonymousIdentity,
} from "@/lib/auth/anonymousIdentity";
import {
  readCurrentSessionId,
  writeCurrentSessionId,
} from "@/lib/session/currentSession";

type PracticeStartPanelProps = {
  scenarioSlug: string;
};

type PracticeStartStatus = "loading" | "ready" | "error";

export function PracticeStartPanel({ scenarioSlug }: PracticeStartPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PracticeStartStatus>("loading");
  const [scenario, setScenario] = useState<ScenarioDetail>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [startErrorMessage, setStartErrorMessage] = useState<string>();
  const [isStarting, setIsStarting] = useState(false);
  const [resumeSessionId, setResumeSessionId] = useState<string>();

  const loadScenario = useCallback(
    async (forceAuthentication = false) => {
      setStatus("loading");
      setErrorMessage(undefined);
      setStartErrorMessage(undefined);

      try {
        const detail = await fetchScenarioWithIdentity(scenarioSlug, forceAuthentication);

        setScenario(detail);
        setStatus("ready");
      } catch (error) {
        setScenario(undefined);
        setErrorMessage(getScenarioErrorMessage(error));
        setStatus("error");
      }
    },
    [scenarioSlug],
  );

  useEffect(() => {
    void loadScenario();
  }, [loadScenario]);

  const handleStartPractice = async () => {
    if (!scenario || isStarting) {
      return;
    }

    setIsStarting(true);
    setStartErrorMessage(undefined);
    setResumeSessionId(undefined);

    try {
      const identity = await ensureAnonymousIdentity();
      const session = await createPracticeSession(
        { scenario_slug: scenario.slug },
        identity.access_token,
      );

      writeCurrentSessionId(session.id);
      router.push(`/practice/sessions/${session.id}`);
    } catch (error) {
      if (isSessionAlreadyInProgress(error)) {
        const storedSessionId = readCurrentSessionId();

        setStartErrorMessage(
          "你有一场练习尚未结束。请先完成或结束当前练习，再开始新的场景。",
        );
        setResumeSessionId(storedSessionId);
      } else if (isUnauthorized(error)) {
        clearAnonymousAccessToken();

        try {
          const identity = await authenticateAnonymousIdentity();
          const session = await createPracticeSession(
            { scenario_slug: scenario.slug },
            identity.access_token,
          );

          writeCurrentSessionId(session.id);
          router.push(`/practice/sessions/${session.id}`);
          return;
        } catch (retryError) {
          setStartErrorMessage(getStartErrorMessage(retryError));
        }
      } else {
        setStartErrorMessage(getStartErrorMessage(error));
      }

      setIsStarting(false);
    }
  };

  const isReady = status === "ready" && scenario;

  return (
    <section className="practice-start-shell" aria-labelledby="practice-start-title">
      <Link className="back-link" href="/">
        返回首页
      </Link>

      {status === "loading" ? <PracticeStartLoadingState /> : null}

      {status === "error" ? (
        <div className="practice-start-state" role="alert">
          <p>{errorMessage}</p>
          <button className="state-action" type="button" onClick={() => void loadScenario(true)}>
            重试
          </button>
        </div>
      ) : null}

      {isReady ? (
        <div className="practice-start-card">
          <div className="practice-start-header">
            <p className="eyebrow">开练确认</p>
            <h1 id="practice-start-title">{scenario.name}</h1>
            <p className="practice-start-summary">{scenario.summary}</p>
            <p className="practice-start-meta">预计 {scenario.estimated_minutes} 分钟</p>
          </div>

          <div className="practice-start-steps" aria-label="任务步骤">
            <div className="section-heading">
              <span>任务步骤</span>
              <span>{scenario.steps.length} 步</span>
            </div>
            <ol className="task-step-list">
              {scenario.steps.map((step) => (
                <li className="task-step-item" key={step.step_no}>
                  <span className="task-step-index">{step.step_no}</span>
                  <span>{step.title}</span>
                </li>
              ))}
            </ol>
          </div>

          {startErrorMessage ? (
            <div className="practice-start-alert" role="alert">
              <p>{startErrorMessage}</p>
              {resumeSessionId ? (
                <Link className="state-action state-action-inline" href={`/practice/sessions/${resumeSessionId}`}>
                  继续当前练习
                </Link>
              ) : null}
            </div>
          ) : null}

          <button
            className="primary-action"
            type="button"
            disabled={isStarting}
            onClick={() => void handleStartPractice()}
          >
            {isStarting ? "正在创建练习..." : "开始练习"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function PracticeStartLoadingState() {
  return (
    <div className="practice-start-card practice-start-card-loading" aria-live="polite" aria-busy="true">
      <span className="loading-line loading-line-title" />
      <span className="loading-line" />
      <span className="loading-line loading-line-short" />
      <span className="loading-line loading-line-button" />
    </div>
  );
}

async function fetchScenarioWithIdentity(scenarioSlug: string, forceAuthentication: boolean) {
  const identity = forceAuthentication
    ? await authenticateAnonymousIdentity()
    : await ensureAnonymousIdentity();

  try {
    return await getScenario(scenarioSlug, identity.access_token);
  } catch (error) {
    if (!isUnauthorized(error)) {
      throw error;
    }

    clearAnonymousAccessToken();
    const freshIdentity = await authenticateAnonymousIdentity();

    return getScenario(scenarioSlug, freshIdentity.access_token);
  }
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

function isSessionAlreadyInProgress(error: unknown) {
  return error instanceof ApiRequestError && error.code === "SESSION_ALREADY_IN_PROGRESS";
}

function getScenarioErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === "SCENARIO_NOT_FOUND") {
      return "场景不存在或已下架。";
    }

    if (error.status === 401) {
      return "匿名身份已失效，请重试恢复。";
    }

    return error.message || "场景详情加载失败，请稍后重试。";
  }

  return "无法连接服务，请确认后端已启动。";
}

function getStartErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === "RATE_LIMITED") {
      return "今日练习次数已达上限，请明天再试。";
    }

    if (error.code === "SCENARIO_NOT_FOUND") {
      return "场景不存在或已下架。";
    }

    return error.message || "创建练习失败，请稍后重试。";
  }

  return "无法连接服务，请确认后端已启动。";
}
