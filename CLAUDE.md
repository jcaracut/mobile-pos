# Tugkaran POS — Constitution

> Authoritative source of truth for coding standards, architecture decisions, naming conventions, and contribution workflow. All contributors must read this document before opening a pull request.

---

## 1. Guiding Principles

| Principle | Description |
|---|---|
| **Local-first** | Every feature must work with zero network connectivity. The database is the truth. |
| **Strict types** | `any` is forbidden. TypeScript strict mode is always on. |
| **Thin UI, fat services** | Screens and components never touch the database directly. All writes go through a `*Service` class. |
| **Predictable state** | Observables from WatermelonDB replace global state stores wherever possible. |
| **Future-proof sync** | Code is structured so a backend can be added without touching feature screens. |

---

## 2. Directory Structure

```
tugkaran/
├── app/                        # Expo Router entry points (file-based routing)
│   └── (tabs)/
│       ├── index.tsx           # POS / Checkout tab
│       ├── orders.tsx
│       ├── inventory.tsx
│       ├── reports.tsx
│       └── settings.tsx
│
├── src/
│   ├── core/                   # Framework-agnostic business logic
│   │   ├── database/
│   │   │   ├── index.ts        # Singleton Database instance
│   │   │   ├── schema/         # WatermelonDB appSchema
│   │   │   ├── models/         # One file per Model class
│   │   │   ├── migrations/     # Append-only migration history
│   │   │   └── sync/           # SyncManager (stub → real when backend exists)
│   │   ├── config/             # App-level constants (tax rate, currency, etc.)
│   │   ├── types/              # Shared domain primitives (ID, Money, Result<T>)
│   │   └── utils/              # Pure utility functions (currency formatting, etc.)
│   │
│   ├── features/               # Vertical slices, one per domain
│   │   ├── auth/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── orders/
│   │   ├── sales/
│   │   ├── customers/
│   │   ├── reports/
│   │   └── settings/
│   │       ├── screens/        # Full-page React Native screens
│   │       ├── components/
│   │       │   ├── organisms/  # Complex, feature-specific composites
│   │       │   ├── molecules/  # Multi-atom composites
│   │       │   └── atoms/      # Smallest reusable units
│   │       ├── hooks/          # Feature-scoped custom hooks
│   │       ├── services/       # All database write operations
│   │       └── types/          # Feature-local TypeScript types
│   │
│   ├── shared/                 # Cross-feature UI & utilities
│   │   ├── components/
│   │   │   ├── ui/             # Buttons, inputs, badges, modals
│   │   │   ├── layout/         # Screen wrappers, safe areas, headers
│   │   │   └── forms/          # Controlled form atoms
│   │   ├── hooks/              # useDebounce, usePrevious, etc.
│   │   └── utils/              # formatMoney, formatDate, etc.
│   │
│   ├── navigation/             # Navigator types & linking config
│   └── theme/                  # Colors, spacing, typography tokens
│
├── assets/
├── scripts/                    # Dev tooling (seed, reset DB, etc.)
├── CONSTITUTION.md
├── SKILLS.md
├── tsconfig.json
└── app.json
```

---

## 3. Architecture Rules

### 3.1 Data layer boundaries

```
Screen / Hook
    │  reads via withObservables() or useDatabase()
    │  writes via ──────────────────────────────────► *Service.method()
    │                                                        │
    ▼                                                        ▼
WatermelonDB Observable                               database.write()
```

- **Never** call `database.write()` inside a component or hook.
- **Never** import `database` directly from a feature screen.
- All writes must be wrapped in a single `database.write()` batch when touching multiple tables.

### 3.2 Model rules

- One model per file: `src/core/database/models/Product.ts`.
- Computed getters (e.g., `get margin()`) are allowed on Model classes — they are pure derivations.
- Business logic (multi-table operations, validations) belongs in a `*Service`, not on the model.

### 3.3 Migration rules

- **Never edit** a committed migration. Always append a new one.
- Bump `schema.version` by exactly 1 per release that changes the schema.
- Document the reason for each migration in a code comment above the migration block.

### 3.4 Sync boundary

- All sync logic lives in `src/core/database/sync/`.
- Feature code communicates with sync via a `useSyncStatus()` hook — it never imports `SyncManager` directly.
- When a backend is introduced, only `SyncManager.sync()` changes. Zero feature files change.

---

## 4. TypeScript Standards

```jsonc
// tsconfig.json highlights (see full file at root)
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

### Prohibited patterns

| Pattern | Why |
|---|---|
| `any` | Defeats type safety; use `unknown` and narrow. |
| Non-null assertion `!` (except in WatermelonDB decorators) | Hides nullability bugs at runtime. |
| `// @ts-ignore` / `// @ts-expect-error` without a comment explaining why | Silent suppression of errors. |
| `enum` | Use `type Foo = 'a' \| 'b'` — enums produce unexpected JS output. |
| Default exports from feature modules | Named exports are tree-shakeable and refactor-safe. |

### Type naming conventions

| Thing | Convention | Example |
|---|---|---|
| Interface | PascalCase | `OrderSummary` |
| Type alias | PascalCase | `PaymentMethod` |
| Generic parameter | Single capital or descriptive | `T`, `TData` |
| Enum-like union | PascalCase | `OrderStatus` |
| Props interface | ComponentName + `Props` | `ProductCardProps` |

---

## 5. Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Files (component) | PascalCase | `ProductCard.tsx` |
| Files (hook) | camelCase, `use` prefix | `useCart.ts` |
| Files (service) | PascalCase, `Service` suffix | `OrderService.ts` |
| Files (utility) | camelCase | `formatMoney.ts` |
| WatermelonDB model | PascalCase, singular | `Product` |
| Database table | snake_case, plural | `products` |
| Column | snake_case | `unit_price` |
| Model field decorator | camelCase | `unitPrice` |
| React component | PascalCase | `CheckoutScreen` |
| Hook return value | descriptive object | `{ items, addItem, ... }` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_TAX_RATE` |

---

## 6. Component Design (Atomic Design)

```
atoms        →  smallest units: Button, Badge, TextInput, Icon
molecules    →  2–5 atoms with single purpose: SearchBar, PriceTag
organisms    →  complex sections: ProductGrid, CartDrawer, OrderSummaryCard
screens      →  one per route; composes organisms; owns navigation params type
```

### Rules

- Atoms and molecules must be **stateless** — they accept props and emit callbacks.
- Organisms may hold local UI state (e.g., expanded/collapsed) but must not call services.
- Screens own the service call orchestration.
- Shared components live in `src/shared/components/`. Feature-only components live in `src/features/<name>/components/`.

---

## 7. State Management

| State type | Tool |
|---|---|
| Server / persisted data | WatermelonDB observables via `withObservables` or `useDatabase` |
| Session / cart | `useState` / `useReducer` in a feature hook (e.g., `useCart`) |
| Global UI (toasts, modals) | React Context — keep it narrow; one context per concern |
| Navigation state | Expo Router — no manual navigation state |

No Redux, no Zustand, no MobX. WatermelonDB's reactive queries are the state layer for persisted data.

---

## 8. Coding Standards

### Functions

- Maximum function length: **40 lines** of logic (excluding type declarations).
- Prefer `async/await` over `.then()` chains.
- Extract repeated logic into a named helper rather than a comment.

### Comments

- Write comments only when the **why** is non-obvious (hidden constraint, workaround, known limitation).
- Never write comments that restate what the code already says.
- TODOs must include a ticket reference: `// TODO [TUG-42]: implement discount stacking`.

### Imports

- Group in order: React/RN → Expo → third-party → `@core` → `@features` → `@shared` → relative.
- No circular imports between features. Features may import from `@core` and `@shared` only.

---

## 9. Contribution Workflow

```
main ──────────────────────────────────────────────────────► (protected)
       │
       └── feature/<ticket>-short-description
               │  git push → open PR
               │  CI: typecheck + lint + unit tests
               └── 1 approval required → squash merge
```

### Branch naming

| Type | Pattern |
|---|---|
| Feature | `feature/TUG-42-add-discount-screen` |
| Bug fix | `fix/TUG-55-cart-negative-quantity` |
| DB migration | `migration/v2-add-supplier-table` |
| Hotfix | `hotfix/TUG-99-pos-crash-on-empty-cart` |

### Commit messages

Follow Conventional Commits:

```
feat(orders): add void order capability
fix(inventory): clamp quantity to 0 on stock decrement
migration(v2): add barcode column to products
chore(deps): bump watermelondb to 0.28
```

### PR checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx eslint src/` passes with zero errors
- [ ] New model fields have a corresponding migration entry
- [ ] Service methods are covered by at least one unit test
- [ ] No `database.write()` calls outside `*Service` files
- [ ] `SKILLS.md` updated if a new technology or pattern is introduced

---

## 10. Security & Data Privacy

- No customer PII leaves the device without explicit user action.
- Payment method values are UI labels only — no card numbers or tokens are stored.
- Use `expo-secure-store` for any PIN, passcode, or API key — never `AsyncStorage`.
- When sync is implemented, all HTTP calls must use HTTPS; no plaintext endpoints.

---

*Last updated: 2026-06-13 — bump this date whenever you change a rule.*
