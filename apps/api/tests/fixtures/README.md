# Mock Fixtures（E-03）

本目录提供联调与测试可复用的 mock 数据，与工程师 B 的 `mock_provider` 契约对齐。

## 目录结构

```text
fixtures/
  loader.py              # 统一读取入口
  transcripts/           # 3 个场景 + 低置信样例
  ai_replies/            # 3 个场景 AI 回复序列
  reports/               # mock 报告 JSON（ReportSchema）
  audio/                 # 极小占位音频（非真实编码，仅用于上传测试）
  generate_audio.py      # 重新生成占位音频
```

## 读取方式

```python
from tests.fixtures.loader import (
    load_transcript,
    load_ai_replies,
    load_report,
    load_audio_bytes,
)

interview = load_transcript("interview")
replies = load_ai_replies("restaurant")
report = load_report("default")
audio = load_audio_bytes("interview_user.webm")
```

在 `apps/api` 目录下运行 pytest 时，可直接 `import tests.fixtures.loader`。

## 音频说明

- 占位文件为极小字节序列，**不是**可播放 WebM；mock ASR 不解析音频内容。
- `low_confidence_user.webm` 文件名含 `low_confidence`，可触发 mock ASR 低置信路径。
- 如需真实浏览器录音做手动联调，请在本地录制后覆盖 `audio/` 下对应文件，或设置 `MOCK_ASR_LOW_CONFIDENCE=true`。

重新生成占位音频：

```bash
cd apps/api
python tests/fixtures/generate_audio.py
```

## 契约对齐

| Fixture | 对齐来源 |
|---|---|
| `transcripts/interview.json` | `mock_provider.DEFAULT_TRANSCRIPT` |
| `transcripts/low_confidence.json` | `mock_provider.LOW_CONFIDENCE_TRANSCRIPT` |
| `ai_replies/*.json` | `mock_provider.MOCK_AI_REPLIES` |
| `reports/default.json` | `mock_provider.MOCK_REPORT` + `ReportSchema` |
