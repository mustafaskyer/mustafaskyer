import test from "node:test";
import assert from "node:assert/strict";

import {
  formatEvent,
  formatFollowersBadge,
  replaceBoundedBlock,
} from "./sync-github-activity.mjs";

test("formats follower badge with a static Shields value", () => {
  const badge = formatFollowersBadge(78);

  assert.equal(
    badge,
    `<!-- GITHUB-FOLLOWERS:START -->
[![GitHub followers](https://img.shields.io/badge/Follow-78-007ec6?style=for-the-badge&logo=github&logoColor=white&labelColor=555555)](https://github.com/mustafaskyer)
<!-- GITHUB-FOLLOWERS:END -->`,
  );
  assert.doesNotMatch(badge, /img\.shields\.io\/github\/followers/);
});

test("replaces bounded README blocks by marker name", () => {
  const content = [
    "before",
    "<!-- GITHUB-FOLLOWERS:START -->",
    "old",
    "<!-- GITHUB-FOLLOWERS:END -->",
    "after",
  ].join("\n");

  assert.equal(
    replaceBoundedBlock(
      content,
      "GITHUB-FOLLOWERS",
      "<!-- GITHUB-FOLLOWERS:START -->\nnew\n<!-- GITHUB-FOLLOWERS:END -->",
    ),
    [
      "before",
      "<!-- GITHUB-FOLLOWERS:START -->",
      "new",
      "<!-- GITHUB-FOLLOWERS:END -->",
      "after",
    ].join("\n"),
  );
});

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
