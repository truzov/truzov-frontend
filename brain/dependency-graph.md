# Core Dependency Graph: Truzov

The flowchart below visualizes the architectural layout and dependency hierarchy within the Truzov application.

---

## Workspace Dependency Graph

```mermaid
graph TD
    %% Define Layers
    subgraph Routes ["Pages & Routing (app/)"]
        R_Shop["Shop Pages (app/(shop)/)"]
        R_Account["Account Pages (app/(account)/)"]
        R_Admin["Admin Pages (app/admin/)"]
        R_Vendor["Vendor Pages (app/vendor/)"]
        R_Lab["Lab Pages (app/lab/)"]
    end

    subgraph Views ["Visual Components (components/)"]
        S_Cust["Customer Screens (CustomerScreens.tsx)"]
        S_Auth["Auth Screens (AuthScreens.tsx)"]
        S_Work["Workspace Screens (WorkspaceScreens.tsx)"]
        C_Dash["Dashboard Core Components (components/dashboard/*)"]
        UI["Atomic UI components (components/ui/*)"]
    end

    subgraph State ["State & Logic"]
        Store["Zustand Stores (store/*)"]
        Hooks["Custom Hooks (hooks/*)"]
    end

    subgraph Data ["API Client & Core Data"]
        API["API Fetch Client (lib/api/client.ts)"]
        Mock["Mock Service Worker (mocks/handlers.ts)"]
        Fixtures["Mock Fixtures (lib/data/fixtures.ts)"]
        Types["Type Interfaces (types/index.ts)"]
    end

    %% Routing Dependencies
    R_Shop --> S_Cust
    R_Account --> S_Cust
    R_Admin --> S_Work
    R_Vendor --> S_Work
    R_Lab --> S_Work

    %% Screen Dependencies
    S_Cust --> UI
    S_Cust --> Store
    S_Auth --> UI
    S_Auth --> Store
    S_Work --> C_Dash
    S_Work --> UI
    S_Work --> Store
    C_Dash --> UI

    %% State Dependencies
    Store --> API
    Hooks --> Store

    %% Data Dependencies
    API --> Types
    Mock --> Fixtures
    Fixtures --> Types
    Store --> Types
```

---

## Core Dependency Rules

1. **Atomic Isolation:** Components inside `components/ui/` must remain pure visual blocks and should not import state stores (`store/`) or coordinate route page navigations directly.
2. **Uni-directional Data Fetching:** UI components fetch/push data using Zustand state stores or custom API fetch helpers, never accessing the raw MSW mock configurations directly.
3. **Types Priority:** Interfaces in `types/index.ts` must act as the source of truth for all schemas. No local TypeScript overrides.
