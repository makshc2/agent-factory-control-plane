# agent-factory-control-plane

Multi-project board for [agent-orchestrator-kit](https://github.com/makshc2/agent-orchestrator-kit) consumers.

This is a separate product (Phase 4), not part of the kit npm package. v1 is a dashboard over many GitHub and GitLab repos: active OpenSpec change, pipeline phase, task progress, review verdict, PR/MR.

Kit stays the local installer and CLI. This repo will poll git artifacts (`openspec/changes/`, `handoff.md`, `tasks.md`, `review.md`) and show one board.
