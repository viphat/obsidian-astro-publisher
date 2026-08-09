# Unicode Tag Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Chinese and other Unicode letter/number tags generate readable static tag routes without changing note-slug rules.

**Architecture:** `src/lib/slug.ts` remains the sole tag URL normalizer. Its tag-specific normalizer will preserve Unicode letters and numbers after the existing Latin/Vietnamese normalization, and `getTagGroups` will consume the resulting non-empty slug without any new routing code. Root Vitest tests will lock this behavior alongside existing ASCII and Vietnamese routes.

**Tech Stack:** Astro 5, TypeScript, Vitest 3, Unicode property escapes in JavaScript regular expressions.

## Global Constraints

- Change tag URL normalization only; `SAFE_SLUG_PATTERN` and the plugin's note-slug validation stay byte-identical and ASCII-only.
- Keep existing ASCII and Vietnamese tag routes unchanged.
- Do not modify the publishing plugin, content schema, or frontmatter normalization.
- A tag containing only punctuation or emoji must still produce no tag group.
- Use TDD: observe the new test fail before editing production code.
- Run `npm run verify` before committing the implementation.

---

### Task 1: Preserve Unicode characters in tag slugs

**Files:**
- Modify: `tests/site-notes.test.ts:21-28, 64-78`
- Modify: `src/lib/slug.ts:19-28`

**Interfaces:**
- Consumes: `slugifyTag(tag: string): string`, `getTagPath(tag: string): string`, and `getTagGroups(notes)`.
- Produces: readable Unicode tag route segments; callers continue to use the same functions and types.

- [ ] **Step 1: Write the failing regression tests**

  Add these expectations to the existing tag-slug test, preserving its existing ASCII/Vietnamese expectations:

  ```ts
  expect(slugifyTag("中文")).toBe("中文");
  expect(slugifyTag("中文 / 学习")).toBe("中文-学习");
  expect(getTagPath("中文")).toBe("/tags/中文");
  ```

  Add a focused grouping test using real helper calls:

  ```ts
  it("groups Chinese-only tags into readable route slugs", () => {
    const tagged = [
      { data: { title: "A", updated_at: "2026-01-01", tags: ["中文"] } },
      { data: { title: "B", updated_at: "2026-01-02", tags: ["中文", "学习"] } }
    ];

    expect(getTagGroups(tagged)).toEqual([
      expect.objectContaining({ slug: "中文", label: "中文", notes: [tagged[0], tagged[1]] }),
      expect.objectContaining({ slug: "学习", label: "学习", notes: [tagged[1]] })
    ]);
  });
  ```

- [ ] **Step 2: Run the focused test and verify the expected failure**

  Run:

  ```sh
  npx vitest run --config vitest.config.ts -t "slugifies tags into URL-safe segments|groups Chinese-only tags into readable route slugs"
  ```

  Expected: the Chinese slug expectations fail because the current ASCII-only replacement creates an empty tag slug; the grouping expectation fails because `getTagGroups` skips empty slugs.

- [ ] **Step 3: Implement the minimal Unicode-aware tag normalization**

  In `slugifyTag`, replace the ASCII-only allowed-character expression with a Unicode-property expression while preserving every other normalization step:

  ```ts
  .replace(/[^\p{L}\p{N}]+/gu, "-")
  ```

  The `u` flag is required for Unicode property escapes. Do not alter `SAFE_SLUG_PATTERN`, `isSafeSlug`, or any plugin file.

- [ ] **Step 4: Run the focused test and verify it passes**

  Run:

  ```sh
  npx vitest run --config vitest.config.ts -t "slugifies tags into URL-safe segments|groups Chinese-only tags into readable route slugs"
  ```

  Expected: both focused behaviors pass, including the existing ASCII/Vietnamese assertions.

- [ ] **Step 5: Run the complete verification gate**

  Run:

  ```sh
  npm run verify
  ```

  Expected: root tests, Astro check/build, plugin tests, and plugin bundle all exit successfully. The static build output includes generated `/tags/中文/` and `/tags/学习/` routes when test content is not involved; if the repository has no Chinese content fixture, the unit tests remain the direct proof of grouping and route construction.

- [ ] **Step 6: Commit the implementation**

  ```sh
  git add src/lib/slug.ts tests/site-notes.test.ts
  git commit -m "feat: support unicode tag routes"
  ```
