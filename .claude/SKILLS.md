# Tugkaran POS — Skills Roadmap

> A structured map of the technical competencies required to maintain, extend, or onboard onto the Tugkaran POS codebase. Organized by domain, with learning resources and practical checkpoints for each skill.

---

## Skill Tiers

| Tier | Meaning |
|---|---|
| **Foundation** | Required before writing any code in this repo |
| **Core** | Required for day-to-day feature work |
| **Advanced** | Required for architecture changes, migrations, or sync integration |
| **Expert** | Required for performance optimization and platform-level work |

---

## 1. TypeScript — Foundation

### What to know

- Strict mode semantics: `noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- Discriminated unions as the primary control-flow pattern
- Generic constraints and conditional types
- Module augmentation for extending third-party types
- `satisfies` operator vs type annotation vs `as`

### Checkpoints

- [ ] Can explain why `noUncheckedIndexedAccess` makes array access return `T | undefined`
- [ ] Can narrow `unknown` to a concrete type safely
- [ ] Can write a `Result<T, E>` type and use it without `try/catch` leaking
- [ ] Can add a new field to a WatermelonDB model and keep TypeScript happy end-to-end

### Resources

- TypeScript Handbook — Narrowing, Generics, Template Literal Types
- `ts-reset` library (understand what it patches and why)

---

## 2. React Native & Expo — Foundation

### What to know

- Expo SDK lifecycle: managed workflow vs bare workflow trade-offs
- Expo Router v3: file-based routing, layouts, dynamic segments, typed routes
- `SafeAreaProvider`, `KeyboardAvoidingView`, platform-specific styles
- `FlatList` vs `FlashList` performance characteristics
- Hermes engine implications (no `eval`, limited `Proxy` support)

### Checkpoints

- [ ] Can add a new tab screen without breaking existing navigation types
- [ ] Can write a `FlatList` with `keyExtractor` and `getItemLayout` for large product lists
- [ ] Can configure an Expo plugin in `app.json` without ejecting
- [ ] Understands the difference between `expo-modules-core` and a bare native module

### Resources

- Expo Router docs — Layouts, Groups, Dynamic Routes
- Shopify FlashList — rationale for replacing `FlatList`

---

## 3. WatermelonDB — Core

### What to know

#### Schema & Models

- `appSchema` / `tableSchema` column types: `string`, `number`, `boolean` (no `Date` — dates are stored as `number`)
- `@field`, `@date`, `@readonly`, `@relation`, `@children`, `@lazy` decorators
- Difference between `@relation` (belongs-to) and `@children` (has-many)
- `Model.associations` — required for join queries

#### Querying

- `Query` object vs executing it (`.fetch()` vs `.observe()` vs `.observeWithColumns()`)
- `Q.where`, `Q.and`, `Q.or`, `Q.on` for cross-table conditions
- `Q.sortBy`, `Q.take`, `Q.skip` for pagination
- When to use `.observeWithColumns(['price'])` to avoid over-rendering

#### Writing

- **Every mutation must be inside `database.write()`**
- Batching: use a single `write()` for multi-table operations — never nest `write()` calls
- `collection.create()`, `record.update()`, `record.markAsDeleted()` vs `record.destroyPermanently()`
- Never store derived values you can compute — only store raw data

#### Reactivity

- `withObservables` HOC pattern for class components
- `useDatabase()` + manual subscription for functional components
- Avoiding subscription leaks: always return the unsubscribe function from `useEffect`

### Checkpoints

- [ ] Can add a new column to an existing table with a migration and not break existing data
- [ ] Can write a query that joins `orders` → `order_items` → `products` in one observable
- [ ] Can explain why a `database.write()` must never be called inside another `database.write()`
- [ ] Can batch-create 100 order items in a single write transaction
- [ ] Can implement `.observeWithColumns()` to minimize re-renders on a price change

### Common pitfalls

| Mistake | Consequence | Fix |
|---|---|---|
| Calling `.fetch()` in render | Async in render, no reactivity | Use `.observe()` + `useEffect` |
| Nesting `database.write()` | Deadlock or data corruption | Flatten into one `write()` call |
| Storing computed totals | Data drift when inputs change | Compute in a getter or selector |
| Missing `isIndexed: true` on FK columns | Slow join queries at scale | Add index in schema + migration |
| Using `record.destroyPermanently()` pre-sync | Breaks sync diff — remote still has the record | Use `markAsDeleted()` until synced |

### Resources

- WatermelonDB docs — Guides → Connecting Components, Advanced Queries
- `@nozbe/watermelondb/sync` source — understand `pullChanges`/`pushChanges` contract

---

## 4. SQLite & WatermelonDB Performance — Advanced

### What to know

- JSI adapter vs legacy bridge: `jsi: true` in adapter config enables synchronous SQLite access on-thread
- Index strategy: index every foreign key; index columns used in `Q.where` with high cardinality
- `EXPLAIN QUERY PLAN` equivalent: enable WatermelonDB logging to surface slow queries
- WAL mode: WatermelonDB enables WAL by default — understand implications for backup and testing
- Batch size: large `.create()` loops should be split into chunks of ~500 to avoid lock timeout

### Checkpoints

- [ ] Can identify a slow query by enabling `__DEV__` logging and reading the output
- [ ] Can add an index to a column via a migration without dropping the table
- [ ] Can explain the tradeoff between `observeWithColumns` and full-record observation
- [ ] Can describe when WAL mode helps and when it creates issues (e.g., file-based backups)

### Schema versioning rules

```
v1 → v2: addColumns on existing table   ← safe, additive
v2 → v3: createTable                    ← safe, additive
v3 → v4: drop column                    ← NOT supported by WatermelonDB migrations
                                            (must recreate table with unsafeExecuteSql)
```

---

## 5. Sync Architecture — Advanced

### Current state

Sync is stubbed in `src/core/database/sync/SyncManager.ts`. All records are local-only. `_changed` and `_status` meta-columns are managed by WatermelonDB automatically when the sync adapter is active.

### What to know when a backend is introduced

#### WatermelonDB Sync Protocol

```
Client                          Server
  │── GET /sync?lastPulledAt=X ──►│
  │◄── { changes, timestamp } ────│   pullChanges
  │                                │
  │── POST /sync { changes } ─────►│
  │◄── 200 OK ─────────────────────│   pushChanges
```

- `pullChanges` must return `{ created, updated, deleted }` per table and a new `timestamp`
- `pushChanges` receives the same shape with local mutations since last sync
- **Conflict resolution**: WatermelonDB uses last-write-wins by default; implement server-side resolution for financial records (orders, inventory)

#### Turbo Sync (optional optimization)

- Only observable columns that changed trigger re-renders — use `observeWithColumns` in combination with a turbo sync backend for minimal network + render overhead

#### Migration & sync compatibility

- When adding a column, the server must handle `null` values for that column from old clients that haven't migrated yet
- Never remove a column that the server's `pullChanges` response might still return — add a tombstone period

### Checkpoints

- [ ] Can implement `SyncManager.sync()` using `synchronize()` from `@nozbe/watermelondb/sync`
- [ ] Can write a `pullChanges` HTTP handler contract (input/output shape)
- [ ] Can explain why `markAsDeleted()` must be used instead of `destroyPermanently()` in a sync context
- [ ] Can handle a sync conflict for an Order that was modified both locally and on the server

---

## 6. Expo Module Configuration — Core

### What to know

- `app.json` / `app.config.ts` — when to use dynamic config
- Expo plugins (`withAndroidManifest`, `withInfoPlist`) for native config changes without ejecting
- `expo-build-properties` for JVM heap, Gradle config
- EAS Build profiles: `development`, `preview`, `production`
- `expo-dev-client` for native module testing without a full build

### WatermelonDB-specific Expo setup

```json
// app.json — required for JSI and SQLite
{
  "plugins": [
    ["@nozbe/watermelondb/expo-plugin"]
  ]
}
```

- `jsi: true` in the SQLite adapter requires a development build (not Expo Go)
- Enable Kotlin for Android: `expo-build-properties` with `kotlin.version`

### Checkpoints

- [ ] Can create a new EAS build profile for staging
- [ ] Can add a native permission (e.g., camera for barcode scanning) via an Expo plugin
- [ ] Can explain why `jsi: true` requires a dev build and how to build one locally

---

## 7. Testing Strategy — Core

### Layers

| Layer | Tool | What it tests |
|---|---|---|
| Unit | Jest + `@testing-library/react-native` | Service methods, pure utils, hooks |
| Integration | Jest + in-memory WatermelonDB adapter | Multi-table write operations |
| E2E | Maestro or Detox | Critical flows: checkout, inventory update |

### WatermelonDB testing pattern

```typescript
import { mockDatabase } from '@nozbe/watermelondb/utils/test';

const db = mockDatabase({ schema, modelClasses: [...] });
```

Use the in-memory adapter — never test against the real SQLite file.

### Checkpoints

- [ ] Can write a unit test for `OrderService.createOrder()` using a mock database
- [ ] Can write a hook test with `renderHook` that observes a WatermelonDB query
- [ ] Can configure Maestro to run the full checkout flow on a simulator

---

## 8. Financial Accuracy — Core

### Rules

- All monetary values are stored as **integer cents** (₱ 99.50 → `9950`)
- Display formatting via `formatMoney(cents: number): string` in `src/shared/utils/`
- Never use `toFixed()` for arithmetic — only for display
- Tax calculation: `Math.round(subtotalCents * taxRate)` — always round, never truncate

### Checkpoints

- [ ] Can explain why floating-point arithmetic fails for currency (0.1 + 0.2 ≠ 0.3)
- [ ] Can trace a peso value from user input → cents storage → display formatting

---

## 9. Onboarding Milestones

Use these as a structured ramp-up plan for new contributors.

### Week 1 — Read & explore

- [ ] Read `CONSTITUTION.md` in full
- [ ] Run the app on a simulator using `expo start --dev-client`
- [ ] Read every model file in `src/core/database/models/`
- [ ] Trace the full flow of creating an order: `useCart` → `OrderService` → schema

### Week 2 — First contribution

- [ ] Add a new field to an existing model (non-breaking, with migration)
- [ ] Write a unit test for one service method
- [ ] Submit a PR that passes all CI checks

### Week 3 — Feature ownership

- [ ] Own a full feature slice end-to-end (screen → hook → service → model)
- [ ] Implement a reactive query with `observe()` and zero subscription leaks
- [ ] Review a peer's PR against the standards in `CONSTITUTION.md`

---

*Last updated: 2026-06-13 — update when a new technology or pattern is adopted.*
