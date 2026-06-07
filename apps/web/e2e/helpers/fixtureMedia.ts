import fs from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";

const FIXTURES_DIR = path.join(__dirname, "../fixtures");

export type InterviewFixture = {
  scenario_slug: string;
  transcript: string;
  confidence: number;
  metrics: {
    duration_ms: number;
  };
  audio_fixture: string;
};

export function loadInterviewFixture(): InterviewFixture {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, "interview.transcript.json"), "utf8");
  return JSON.parse(raw) as InterviewFixture;
}

export function loadInterviewAudioFixture(): Buffer {
  const fixture = loadInterviewFixture();
  return fs.readFileSync(path.join(FIXTURES_DIR, fixture.audio_fixture));
}

export async function installFixtureRecording(page: Page) {
  const fixture = loadInterviewFixture();
  const audioBytes = loadInterviewAudioFixture();
  const base64 = audioBytes.toString("base64");

  await page.context().grantPermissions(["microphone"]);

  await page.addInitScript(
    ({ encodedAudio, mimeType, durationMs }) => {
      const binary = atob(encodedAudio);
      const bytes = new Uint8Array(binary.length);

      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      const fixtureBlob = new Blob([bytes], { type: mimeType });

      navigator.mediaDevices.getUserMedia = async () => {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const destination = audioContext.createMediaStreamDestination();

        oscillator.connect(destination);
        oscillator.start();
        window.setTimeout(() => {
          oscillator.stop();
          void audioContext.close();
        }, 50);

        return destination.stream;
      };

      const NativeMediaRecorder = window.MediaRecorder;

      class FixtureMediaRecorder {
        static isTypeSupported(type: string) {
          return NativeMediaRecorder?.isTypeSupported?.(type) ?? true;
        }

        readonly mimeType: string;
        ondataavailable: ((event: BlobEvent) => void) | null = null;
        onstop: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        state: RecordingState = "inactive";

        constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
          this.mimeType = options?.mimeType ?? mimeType;
        }

        start() {
          this.state = "recording";
        }

        stop() {
          this.state = "inactive";

          window.setTimeout(() => {
            this.ondataavailable?.({ data: fixtureBlob } as BlobEvent);
            this.onstop?.(new Event("stop"));
          }, Math.min(durationMs, 300));
        }

        addEventListener(type: string, listener: EventListener) {
          if (type === "dataavailable") {
            this.ondataavailable = listener as (event: BlobEvent) => void;
          }

          if (type === "stop") {
            this.onstop = listener as (event: Event) => void;
          }

          if (type === "error") {
            this.onerror = listener as (event: Event) => void;
          }
        }

        removeEventListener() {
          // RecordRTC only needs a no-op hook for cleanup in tests.
        }
      }

      Object.defineProperty(window, "MediaRecorder", {
        configurable: true,
        writable: true,
        value: FixtureMediaRecorder,
      });

      window.HTMLAudioElement.prototype.play = function play() {
        window.setTimeout(() => {
          this.dispatchEvent(new Event("ended"));
        }, 0);

        return Promise.resolve();
      };

      window.__E2E_FIXTURE_RECORDING__ = {
        mimeType,
        durationMs,
      };
    },
    {
      encodedAudio: base64,
      mimeType: "audio/webm",
      durationMs: fixture.metrics.duration_ms,
    },
  );
}

export async function submitFixtureRecording(page: Page) {
  const talkButton = page.getByRole("button", { name: "按住说话" });
  const box = await talkButton.boundingBox();

  if (!box) {
    throw new Error("Push-to-talk button is not visible.");
  }

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
}

declare global {
  interface Window {
    __E2E_FIXTURE_RECORDING__?: {
      mimeType: string;
      durationMs: number;
    };
  }
}
