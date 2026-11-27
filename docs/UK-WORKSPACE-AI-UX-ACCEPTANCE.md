# UK workspace experience and governed AI review — November 2026

## External patterns reviewed

- [shadcn/ui sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) and
  [shadcn/ui component guidance](https://github.com/shadcn-ui/ui/blob/main/skills/shadcn/SKILL.md):
  compose established accessible primitives, group navigation and avoid duplicated controls.
- [OpenAI Agents SDK guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)
  and [Agents SDK repository](https://github.com/openai/openai-agents-python):
  explicit permission boundaries, human review for side effects and observable agent activity.
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript/releases):
  permission checks, hooks, tool approval and controlled agent access.
- [Google ADK / Gemini](https://github.com/google/adk-python):
  modular orchestration, retry and state, human-in-the-loop and evaluation of agent workflows.
- [Qwen-Agent](https://github.com/QwenLM/Qwen-Agent):
  structured tool calling, RAG, MCP and agent evaluation.
- [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/index.mdx):
  consent, authorization, least privilege and untrusted tool metadata.

These are design and engineering references, not a claim that these providers are deployed.

## Implemented in this branch

- Six guided questions corresponding to the existing UK Omniqora review kinds.
- Explicit sharing confirmation that resets when a draft is edited or selected.
- Correct disclosure of organisation-wide evidence scope.
- Responsive review options, pending-run form locking, safe text-only response rendering and
  a collapsible provider-reported activity panel.
- Retain entitlement, role, workspace and polling controls. Proposed actions remain advisory;
  this screen does not approve or execute them.

## Acceptance matrix

| Area | Required evidence |
| --- | --- |
| Web layout | 360, 390, 768, 1024 and 1440 CSS pixel widths; no horizontal overflow |
| Keyboard | Tab order, visible focus, Escape, arrow keys and Enter in workspace search |
| Screen readers | Dialog name, input name, status and error announcements; axe plus manual checks |
| Access control | All tenant roles, inspector scopes, direct URLs and two unrelated tenants |
| Native | Android and iOS tool search, large text, focus recovery, empty and unavailable states |
| AI input | 10–3000 trimmed characters, confirmation reset on edit, no automatic submission |
| AI runtime | Missing entitlement, disconnected service, timeout, malformed result, stale run |
| AI outputs | Source references, missing evidence, disagreement, no unsupervised approval |
| Agent/MCP | Server-side tool allowlist, tenant authorization, approval audit, timeouts and replay |
| Performance | Measure p50/p95 load latency, request count, render cost and bundle size |

## Further implementation gates

Keep Omniqora as the governed integration boundary. Evaluate OpenAI, Claude, Gemini and Qwen
against the same synthetic UK compliance fixtures before enabling providers with real tenant data.
Record model/provider/version, evidence coverage, uncertainty, latency and tool failures. Never
route real tenant data to an external provider without confirmed permissions and privacy controls.

Server-enforced action approvals, atomic PPDS issuance, tenant-scoped MCP tool execution, agent
tracing/evaluation infrastructure and actual provider activation remain separate work. The new
confirmation is a client-side interaction, not a new server-side permission or privacy control.
Production credentials, authenticated acceptance and physical-device visual verification are
required before claiming production readiness.
