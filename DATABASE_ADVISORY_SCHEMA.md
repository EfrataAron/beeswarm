# Advisory System Database Schema

## Overview

The advisory system uses three interconnected tables to provide actionable recommendations to beekeepers based on ML model predictions. This document explains the relationships and data flow between these tables.

---

## Table Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADVISORY SYSTEM ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────┐
  │  ADVISORY_TEMPLATES      │  ← Master table of alert classes/templates
  │  (Alert Classes)         │
  ├──────────────────────────┤
  │ • id (PK)                │     Examples:
  │ • classification         │     - pre-swarm
  │ • severity               │     - swarm
  │ • title                  │     - disease
  │ • description            │     - mite_infestation
  └───────────┬──────────────┘     - queen_loss
              │
              │ 1:M (one template has many possible action configs)
              │
              ▼
  ┌──────────────────────────┐
  │  ADVISORY_ACTION_CONFIGS │  ← All possible actions per template
  │  (Action Library)        │     with confidence thresholds
  ├──────────────────────────┤
  │ • id (PK)                │
  │ • template_id (FK)       │  ──┐
  │ • description            │    │ For "pre-swarm" template:
  │ • priority               │    │ ────────────────────────
  │ • min_confidence_%       │    │ • Check for queen cells (High, 80%)
  │ • max_confidence_%       │    │ • Investigate hive noise (High, 70%)
  └───────────┬──────────────┘    │ • Monitor temperature (Medium, 60%)
              │                    │ • Provide water nearby (Low, 50%)
              │                    └─ Each action applies at different
              │                       confidence thresholds
              │
              │ M:M (many configs can generate many actual advisories)
              │
              ▼
  ┌──────────────────────────┐
  │  ADVISORIES              │  ← Generated advisories for specific hives
  │  (Active Recommendations)│     when ML model detects an issue
  ├──────────────────────────┤
  │ • id (PK)                │
  │ • alert_id (FK)          │  ──┐ Links to the alert/inference
  │ • hive_id (FK)           │    │ that triggered this advisory
  │ • template_id (FK)       │    │
  │ • type (Preventive/      │    │ EXAMPLE SCENARIO:
  │         Reactive)        │    │ ─────────────────────
  │ • summary                │    │ ML predicts: "pre-swarm" at 82% confidence
  │ • created_at             │    │          for hive "hive-123"
  │                          │    │
  │ [Junction with Actions]  │    │ System creates advisory with actions:
  │ • advisory_actions[]     │    │ • Check for queen cells (82% > 80%)
  └──────────────────────────┘    │ • Investigate noise (82% > 70%)
                                  │ • Monitor temperature (82% > 60%)
                                  └─ • Provide water (82% > 50%)
```

---

## Table Details

### 1. **advisory_templates** (Alert Classes / Templates)

**Purpose:** Master catalog of all possible hive conditions that can be detected by the ML model.

**Structure:**

```sql
CREATE TABLE advisory_templates (
    id                  UUID PRIMARY KEY,
    classification      VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'pre-swarm', 'swarm'
    severity            VARCHAR(20) NOT NULL,          -- 'Critical', 'Warning', 'Info'
    title               VARCHAR(255) NOT NULL,         -- Human-readable title
    description         TEXT,                          -- Detailed explanation
    created_at          TIMESTAMP DEFAULT NOW()
);
```

**Example Data:**
| id | classification | severity | title |
|----|----------------|----------|-------|
| tmpl-001 | pre-swarm | Warning | Pre-swarm Activity Detected |
| tmpl-002 | swarm | Critical | Swarm Alert |
| tmpl-003 | disease | Critical | Disease Symptoms Detected |
| tmpl-004 | mite_infestation | Warning | High Mite Levels |

**Relationship:**

- **1:M** with `advisory_action_configs` - One template has many possible actions

---

### 2. **advisory_action_configs** (Action Library)

**Purpose:** Library of all possible actions that farmers can take for each alert type, with confidence threshold configurations.

**Structure:**

```sql
CREATE TABLE advisory_action_configs (
    id                  UUID PRIMARY KEY,
    template_id         UUID NOT NULL REFERENCES advisory_templates(id),
    description         TEXT NOT NULL,                 -- Action description
    priority            VARCHAR(20) NOT NULL,          -- 'High', 'Medium', 'Low'
    min_confidence_pct  INTEGER NOT NULL DEFAULT 0,    -- Minimum confidence to include
    max_confidence_pct  INTEGER NOT NULL DEFAULT 100,  -- Maximum confidence range
    order_index         INTEGER DEFAULT 0,             -- Display order
    created_at          TIMESTAMP DEFAULT NOW(),

    CHECK (min_confidence_pct >= 0 AND min_confidence_pct <= 100),
    CHECK (max_confidence_pct >= 0 AND max_confidence_pct <= 100),
    CHECK (min_confidence_pct <= max_confidence_pct)
);
```

**Example Data (for pre-swarm template):**
| id | template_id | description | priority | min_confidence | max_confidence |
|----|-------------|-------------|----------|----------------|----------------|
| act-101 | tmpl-001 | Check hive for queen cells and swarm preparations | High | 80 | 100 |
| act-102 | tmpl-001 | Investigate unusual noise or vibrations around hive | High | 70 | 100 |
| act-103 | tmpl-001 | Monitor hive temperature and ventilation | Medium | 60 | 100 |
| act-104 | tmpl-001 | Provide water source near the hive | Low | 50 | 100 |
| act-105 | tmpl-001 | Check if additional space/supers are needed | Medium | 75 | 100 |

**Logic:**

- When ML predicts "pre-swarm" with **82% confidence**, include actions where `min_confidence <= 82`
- Result: Actions act-101, act-102, act-103, act-104, act-105 all qualify
- If prediction was only **65% confidence**, only act-102, act-103, act-104 would be included

**Relationship:**

- **M:1** with `advisory_templates` - Many actions belong to one template
- **M:M** with `advisories` - Multiple configs can appear in multiple advisories (via junction table or array)

---

### 3. **advisories** (Active Recommendations)

**Purpose:** Stores the actual advisory recommendations generated for specific hives when the ML model makes a prediction. This is what farmers see and act upon.

**Structure:**

```sql
CREATE TABLE advisories (
    id                  UUID PRIMARY KEY,
    alert_id            UUID NOT NULL REFERENCES alerts(id),      -- Which alert triggered this
    hive_id             UUID NOT NULL REFERENCES hives(id),       -- Which hive this is for
    template_id         UUID NOT NULL REFERENCES advisory_templates(id),
    type                VARCHAR(20) NOT NULL,                     -- 'Preventive' or 'Reactive'
    summary             TEXT,                                     -- Advisory summary
    confidence_pct      INTEGER,                                  -- ML confidence level
    created_at          TIMESTAMP DEFAULT NOW(),

    -- Actions can be stored as:
    -- Option A: JSON array of action IDs with their data
    actions             JSONB,

    -- OR Option B: Separate junction table (advisory_actions_junction)
);
```

**Alternative Structure (if using junction table for actions):**

```sql
CREATE TABLE advisories (
    id                  UUID PRIMARY KEY,
    alert_id            UUID NOT NULL REFERENCES alerts(id),
    hive_id             UUID NOT NULL REFERENCES hives(id),
    template_id         UUID NOT NULL REFERENCES advisory_templates(id),
    type                VARCHAR(20) NOT NULL,
    summary             TEXT,
    confidence_pct      INTEGER,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE advisory_actions_junction (
    advisory_id         UUID NOT NULL REFERENCES advisories(id),
    action_config_id    UUID NOT NULL REFERENCES advisory_action_configs(id),
    completed           BOOLEAN DEFAULT FALSE,
    completed_at        TIMESTAMP,
    PRIMARY KEY (advisory_id, action_config_id)
);
```

**Example Data:**

```json
{
  "id": "adv-2001",
  "alert_id": "alert-5001",
  "hive_id": "hive-123",
  "template_id": "tmpl-001",
  "type": "Preventive",
  "summary": "Pre-swarm behavior detected with high confidence. Take preventive action now.",
  "confidence_pct": 82,
  "actions": [
    {
      "id": "act-101",
      "description": "Check hive for queen cells and swarm preparations",
      "priority": "High"
    },
    {
      "id": "act-102",
      "description": "Investigate unusual noise or vibrations around hive",
      "priority": "High"
    },
    {
      "id": "act-103",
      "description": "Monitor hive temperature and ventilation",
      "priority": "Medium"
    },
    {
      "id": "act-104",
      "description": "Provide water source near the hive",
      "priority": "Low"
    }
  ]
}
```

**Relationship:**

- **M:1** with `alerts` - Many advisories can be generated from one alert (though typically 1:1)
- **M:1** with `hives` - Many advisories for one hive over time
- **M:1** with `advisory_templates` - Many advisories use one template
- **M:M** with `advisory_action_configs` - One advisory contains multiple actions, and one action config can appear in many advisories

---

## Data Flow: From ML Prediction to Advisory

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW SEQUENCE                                │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: ML Model Prediction
────────────────────────────
  Audio Recording → ML Model → Prediction: "pre-swarm" at 82% confidence
                                           for hive "hive-123"

STEP 2: Alert Creation
───────────────────────
  System creates an alert record in the `alerts` table:
  ┌────────────────────────────────────────────┐
  │ alert_id: alert-5001                       │
  │ hive_id: hive-123                          │
  │ classification: "pre-swarm"                │
  │ confidence: 82%                            │
  │ severity: Warning                          │
  │ timestamp: 2026-06-09T10:30:00Z            │
  └────────────────────────────────────────────┘

STEP 3: Template Lookup
────────────────────────
  Query advisory_templates WHERE classification = 'pre-swarm'
  → Returns template: tmpl-001

STEP 4: Action Selection
─────────────────────────
  Query advisory_action_configs WHERE:
    - template_id = tmpl-001
    - min_confidence_pct <= 82
    - max_confidence_pct >= 82

  Returns:
  ┌──────────────────────────────────────────────────────────┐
  │ act-101: Check for queen cells (High, min: 80%)         │
  │ act-102: Investigate noise (High, min: 70%)             │
  │ act-103: Monitor temperature (Medium, min: 60%)         │
  │ act-104: Provide water (Low, min: 50%)                  │
  │ act-105: Check space/supers (Medium, min: 75%)          │
  └──────────────────────────────────────────────────────────┘

STEP 5: Advisory Creation
──────────────────────────
  INSERT INTO advisories:
  ┌────────────────────────────────────────────┐
  │ id: adv-2001                               │
  │ alert_id: alert-5001                       │
  │ hive_id: hive-123                          │
  │ template_id: tmpl-001                      │
  │ type: Preventive                           │
  │ summary: "Take preventive action..."       │
  │ confidence_pct: 82                         │
  │ actions: [act-101, act-102, ...]           │
  └────────────────────────────────────────────┘

STEP 6: Display to Farmer
──────────────────────────
  Mobile app fetches advisory and displays actionable items
  to the beekeeper for hive "hive-123"
```

---

## Key Relationships Summary

### Cardinality:

- **advisory_templates : advisory_action_configs** = **1 : M**
  - One alert class (e.g., "pre-swarm") has many possible actions
- **advisory_templates : advisories** = **1 : M**
  - One template is used to generate many advisories over time
- **advisory_action_configs : advisories** = **M : M**
  - Multiple action configs can appear in multiple advisories
  - Managed via JSONB array or junction table
- **alerts : advisories** = **1 : 1** (typically) or **1 : M**
  - Each alert typically generates one advisory
  - Could be 1:M if different advice is given based on other factors

### Foreign Keys:

```
advisory_action_configs.template_id → advisory_templates.id
advisories.alert_id → alerts.id
advisories.hive_id → hives.id
advisories.template_id → advisory_templates.id
```

---

## Example Query: Generate Advisory

```sql
-- When ML predicts "pre-swarm" at 82% for hive-123:

-- 1. Get template
SELECT id, classification, severity
FROM advisory_templates
WHERE classification = 'pre-swarm';
-- Returns: tmpl-001

-- 2. Get applicable actions
SELECT id, description, priority
FROM advisory_action_configs
WHERE template_id = 'tmpl-001'
  AND min_confidence_pct <= 82
  AND max_confidence_pct >= 82
ORDER BY priority DESC, order_index ASC;
-- Returns: act-101, act-102, act-103, act-104, act-105

-- 3. Create advisory
INSERT INTO advisories (id, alert_id, hive_id, template_id, type, summary, confidence_pct, actions)
VALUES (
  gen_random_uuid(),
  'alert-5001',
  'hive-123',
  'tmpl-001',
  'Preventive',
  'Pre-swarm behavior detected. Take action to prevent swarming.',
  82,
  '[{"id": "act-101", "description": "Check for queen cells...", "priority": "High"}, ...]'::jsonb
);
```

---

## API Response Structure

Based on your current TypeScript types:

```typescript
export type Advisory = {
  id: string; // Advisory record ID
  alertId: string; // Links to the alert that triggered this
  type: "Preventive" | "Reactive";
  summary: string; // Overall advisory message
  actions: AdvisoryAction[]; // Array of recommended actions
};

export type AdvisoryAction = {
  id: string; // Action config ID
  description: string; // What the farmer should do
  priority: "High" | "Medium" | "Low";
};
```

**Example API Response:**

```json
{
  "id": "adv-2001",
  "alertId": "alert-5001",
  "type": "Preventive",
  "summary": "Pre-swarm behavior detected with high confidence (82%). Immediate inspection and preventive measures recommended.",
  "actions": [
    {
      "id": "act-101",
      "description": "Check hive for queen cells and swarm preparations",
      "priority": "High"
    },
    {
      "id": "act-102",
      "description": "Investigate unusual noise or vibrations around hive",
      "priority": "High"
    },
    {
      "id": "act-103",
      "description": "Monitor hive temperature and ventilation",
      "priority": "Medium"
    },
    {
      "id": "act-104",
      "description": "Provide water source near the hive",
      "priority": "Low"
    }
  ]
}
```

---

## Benefits of This Architecture

1. **Flexibility:** Easy to add new alert types and actions without changing code
2. **Confidence-Based Actions:** Different actions at different confidence thresholds
3. **Maintainable:** Centralized action library that can be updated globally
4. **Scalable:** Supports complex advisory logic with minimal queries
5. **Traceable:** Full audit trail of what advice was given when
6. **Extensible:** Can add action completion tracking, farmer feedback, etc.

---

## Next Steps for Implementation

1. ✅ Understand table relationships (this document)
2. ⬜ Define SQL schema for all three tables
3. ⬜ Populate `advisory_templates` with all ML classifications
4. ⬜ Populate `advisory_action_configs` with actions for each template
5. ⬜ Implement advisory generation logic in backend
6. ⬜ Update API endpoint to return advisories with actions
7. ⬜ Test with various confidence levels
8. ⬜ Update mobile app to display advisory actions to farmers
