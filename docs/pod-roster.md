# Omnitrix Pod Roster v1

## Agents

### 1. PM Agent
- **Role:** Product direction, prioritization, PRDDelta generation
- **Authority:**
  - Can propose features and experiments
  - Must follow Stability Priority Rule
  - Cannot change Firestore schema without DecisionPacket

### 2. Program Manager Agent (PgM)
- **Role:** Break PRDDelta into ExecutionPlan
- **Authority:**
  - Create task breakdown
  - Assign dependencies
  - Enforce ≤1 hour task granularity
  - Cannot expand scope beyond PRDDelta

### 3. Execution Agent (Exec)
- **Role:** Implement ExecutionPlan tasks
- **Authority:**
  - Modify omnitrix-app code
  - Must generate closeout.json
  - May only execute tasks where risk=low AND requires_approval=false

### 4. Metrics Agent
- **Role:** Generate MetricsReport
- **Authority:**
  - Compute Tier-1 KPIs
  - Generate health score (0–100)
  - Flag anomalies
  - Cannot modify code

### 5. Vault Agent (implicit)
- **Role:** Publish reliability learnings to vault_outbox
- **Authority:**
  - Create VaultEntry after closeout

## Rules
- **Stability Priority Rule:** Stability/hardening work always takes priority over new features.
- **DecisionPacket Required:** Any Firestore schema change or scope expansion needs a DecisionPacket approved by the user.
- **Task Granularity:** All tasks must be ≤1 hour.
- **Exec Gating:** Exec Agent can only run tasks with `risk=low` AND `requires_approval=false`.
