import test from "node:test";
import assert from "node:assert/strict";

import { formatEvent } from "./sync-github-activity.mjs";

test("formats public pull request events with GitHub links when html_url is absent", () => {
  const line = formatEvent({
    type: "PullRequestEvent",
    created_at: "2026-06-13T20:14:36Z",
    repo: { name: "mustafaskyer/skills-manager" },
    payload: {
      action: "merged",
      number: 2,
      pull_request: {
        number: 2,
        url: "https://api.github.com/repos/mustafaskyer/skills-manager/pulls/2",
      },
    },
  });

  assert.equal(
    line,
    "- 2026-06-13: Merged pull request [#2](https://github.com/mustafaskyer/skills-manager/pull/2) in [mustafaskyer/skills-manager](https://github.com/mustafaskyer/skills-manager).",
  );
});

test("formats delete events as explicit ref deletions", () => {
  const line = formatEvent({
    type: "DeleteEvent",
    created_at: "2026-06-13T20:14:41Z",
    repo: { name: "mustafaskyer/skills-manager" },
    payload: {
      ref_type: "branch",
      ref: "feat/uninstall",
    },
  });

  assert.equal(
    line,
    "- 2026-06-13: Deleted branch `feat/uninstall` in [mustafaskyer/skills-manager](https://github.com/mustafaskyer/skills-manager).",
  );
});
