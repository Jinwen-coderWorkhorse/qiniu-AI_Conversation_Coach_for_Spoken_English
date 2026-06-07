"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { getScenarios } from "@/lib/api/endpoints";
import type { Scenario } from "@/lib/api/contracts";
import {
  authenticateAnonymousIdentity,
  clearAnonymousAccessToken,
  ensureAnonymousIdentity,
} from "@/lib/auth/anonymousIdentity";

const SCENARIO_LIMIT = 3;

type HomeScenariosStatus = "loading" | "ready" | "error";

export function HomeScenarios() {
  const [status, setStatus] = useState<HomeScenariosStatus>("loading");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadScenarios = useCallback(async (forceAuthentication = false) => {
    setStatus("loading");
    setErrorMessage(undefined);

    try {
      const response = await fetchScenariosWithIdentity(forceAuthentication);

      setScenarios(response.items.slice(0, SCENARIO_LIMIT));
      setStatus("ready");
    } catch (error) {
      setScenarios([]);
      setErrorMessage(getReadableErrorMessage(error));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadScenarios();
  }, [loadScenarios]);

  const isReady = status === "ready";

  return (
    <div className="scenario-panel" aria-label="练习场景">
      <div className="section-heading">
        <span>练习场景</span>
        <span>{isReady ? `${scenarios.length} 个入口` : "准备中"}</span>
      </div>

      {status === "loading" ? <ScenarioLoadingState /> : null}

      {status === "error" ? (
        <div className="scenario-state" role="alert">
          <p>{errorMessage}</p>
          <button className="state-action" type="button" onClick={() => void loadScenarios(true)}>
            重试
          </button>
        </div>
      ) : null}

      {isReady && scenarios.length === 0 ? (
        <div className="scenario-state">
          <p>暂无可用场景。</p>
          <button className="state-action" type="button" onClick={() => void loadScenarios(true)}>
            刷新
          </button>
        </div>
      ) : null}

      {isReady && scenarios.length > 0 ? (
        <div className="scenario-list">
          {scenarios.map((scenario, index) => (
            <ScenarioCard key={scenario.slug} scenario={scenario} toneIndex={index} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function fetchScenariosWithIdentity(forceAuthentication: boolean) {
  const identity = forceAuthentication
    ? await authenticateAnonymousIdentity()
    : await ensureAnonymousIdentity();

  try {
    return await getScenarios(identity.access_token);
  } catch (error) {
    if (!isUnauthorized(error)) {
      throw error;
    }

    clearAnonymousAccessToken();
    const freshIdentity = await authenticateAnonymousIdentity();

    return getScenarios(freshIdentity.access_token);
  }
}

function ScenarioLoadingState() {
  return (
    <div className="scenario-list" aria-live="polite" aria-busy="true">
      {Array.from({ length: SCENARIO_LIMIT }, (_, index) => (
        <div className="scenario-card scenario-card-loading" key={index}>
          <span className="loading-line loading-line-title" />
          <span className="loading-line" />
          <span className="loading-line loading-line-short" />
        </div>
      ))}
    </div>
  );
}

function ScenarioCard({ scenario, toneIndex }: { scenario: Scenario; toneIndex: number }) {
  return (
    <Link
      className="scenario-card"
      data-tone={toneIndex % SCENARIO_LIMIT}
      href={`/practice/${scenario.slug}/start`}
      prefetch={false}
    >
      <span className="scenario-card-topline">
        <span>{scenario.name}</span>
        <span>{scenario.estimated_minutes} 分钟</span>
      </span>
      <span className="scenario-summary">{scenario.summary}</span>
    </Link>
  );
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

function getReadableErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return "匿名身份已失效，请重试恢复。";
    }

    return error.message || "场景加载失败，请稍后重试。";
  }

  return "无法连接服务，请确认后端已启动。";
}
