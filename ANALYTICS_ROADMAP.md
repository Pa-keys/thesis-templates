# MEDISENS RHU Analytics Roadmap

## Purpose

This roadmap defines a read-only RHU Analytics Dashboard for Admin and Doctor roles. It is planning only and does not modify application code, database schema, Supabase logic, business logic, routes, role permissions, or approved Use Case Diagram behavior.

The goal is to help RHU leadership and clinicians understand workload, service performance, and common health trends using safe aggregate data.

## Scope Guardrails

- Analytics must be read-only.
- Analytics should be available to Admin and Doctor only unless role expansion is explicitly approved.
- Preserve all existing RHU workflows and role permissions.
- Use aggregate data by default.
- Avoid exposing individual patient details unless the user navigates through an existing authorized patient workflow.
- Do not claim official PhilHealth compliance without exact report requirements.
- Use SQL-first planning before implementation.

## Dashboard Principles

- Prioritize scan-friendly summaries, trends, and filters.
- Use date ranges by default: today, week, month, quarter, year, custom.
- Keep metrics explainable to RHU staff.
- Avoid vanity charts that do not support operational or clinical decisions.
- Use safe aggregate queries and avoid raw broad exports.
- Keep dashboard loading bounded with query limits and indexed filters.

## Intended Users

### Admin

Admin analytics should focus on operations, staff activity, system usage, report readiness, and service volume.

### Doctor

Doctor analytics should focus on clinical trends, consultation workload, morbidity patterns, common diagnoses, follow-up demand, and patient care throughput.

## Staff Workflow Activity

Possible metrics from existing data:

- Patient registrations by day/week/month.
- Initial consultations recorded by day/week/month.
- Doctor consultations completed by day/week/month.
- Lab requests created and completed.
- Prescriptions created and dispensed.
- Follow-ups scheduled and completed.
- FHSIS log entries by category.
- Audit log events by role, module, and action.
- Staff activity counts by role, where audit logs contain sufficient actor metadata.

Metrics requiring schema/support:

- Time-to-completion per workflow step if start/end timestamps are missing.
- Staff-level productivity by named user if not all writes consistently capture actor ID.
- Abandoned/incomplete workflow rate if draft or status tracking is not available.
- Login/session activity if authentication events are not currently captured in audit logs.

## Health Center Performance

Possible metrics from existing data:

- Total active patients.
- New patients registered.
- Patients seen today.
- Waiting initial consultations.
- Completed consultations.
- Pending follow-ups.
- Pending and completed lab requests.
- Prescription dispensing status.
- Patient counts by sex, age group, and address/barangay-equivalent field.
- FHSIS entries by category and reporting period.

Metrics requiring schema/support:

- Average wait time from intake to doctor consultation.
- Average turnaround time for lab results.
- Average prescription fulfillment time.
- Missed follow-up rate if missed/no-show state is formalized.
- Referral completion outcomes if referral status tracking is added.

## Illness And Disease Frequency Trends

Possible metrics from existing data:

- Diagnosis frequency from `initial_consultation.diagnosis`.
- Diagnosis frequency from `consultation.diagnosis`.
- Chief complaint frequency from initial and doctor consultation fields.
- Trends by date range.
- Trends by age group and sex where aggregate count thresholds are met.
- Follow-up diagnosis patterns if diagnosis is captured in follow-up records.

Important caution:

- Free-text diagnosis and complaint fields may contain spelling variations and mixed terminology.
- Initial analytics can count normalized lowercased text, but clinical-quality trend reporting needs a supported diagnosis/complaint taxonomy.

Metrics requiring schema/support:

- Standard diagnosis codes or controlled diagnosis list.
- Complaint categories.
- Disease classification table.
- Staff-approved mapping from free-text values to normalized categories.
- Confidence/review flags for normalized data.

## Common Diagnoses And Complaints

Initial read-only dashboard cards:

- Top diagnoses this month.
- Top chief complaints this month.
- Diagnosis trend compared with previous period.
- Age-group distribution for top diagnoses.
- Sex distribution for top diagnoses.
- Follow-up demand by diagnosis if reliable.

Privacy-safe display rules:

- Suppress small counts below an approved threshold, such as fewer than 5 cases.
- Avoid showing patient names or individual record IDs in analytics cards.
- Use drilldowns only if they route to existing authorized Patient Records or Audit Log workflows.

## Possible Metrics From Existing Data

No schema changes required if current fields are sufficient and query performance is acceptable:

- Active patient total.
- New registrations over time.
- Patient demographics by sex and age group.
- Patient location distribution using address/barangay-equivalent field.
- Initial consultation volume.
- Doctor consultation volume.
- Lab request status distribution.
- Prescription status distribution.
- Follow-up status distribution.
- FHSIS log count by category.
- Audit activity by module/action/role.
- Common free-text diagnoses and complaints, with caveats.

## Metrics Requiring Schema Or Support

Schema changes or standardization required:

- Normalized diagnosis categories.
- Normalized complaint categories.
- Encounter lifecycle timestamps.
- No-show or missed follow-up status.
- Staff attribution on every clinical write.
- Patient archive status filters.
- Barangay/address normalization.
- Report-definition tables if official report requirements are later provided.
- Materialized analytics views if aggregate queries become expensive.

## Privacy Considerations

- Use aggregate counts by default.
- Restrict analytics to Admin and Doctor unless approved.
- Avoid patient identifiers in analytics cards.
- Apply role checks in UI and database/RLS.
- Suppress small cohorts where re-identification risk exists.
- Use date ranges that do not expose individual visits in low-volume categories.
- Log analytics exports if export functionality is later added.
- Keep technical errors out of the UI.
- Do not send analytics data to third-party services without approval.

## Safe Aggregate Queries

SQL changes may be required for views/functions.

Recommended approach:

- Build SQL views or RPC functions for stable aggregate queries.
- Return only aggregated values needed by dashboard cards.
- Require date range parameters.
- Enforce role authorization before returning analytics.
- Add indexes before enabling expensive aggregates.
- Avoid `select('*')`.
- Avoid client-side aggregation over large raw datasets.
- Consider materialized views only after measuring performance.

Candidate aggregate surfaces:

- `analytics_patient_counts`
- `analytics_service_volume`
- `analytics_lab_status`
- `analytics_prescription_status`
- `analytics_follow_up_status`
- `analytics_fhsis_category_counts`
- `analytics_audit_activity`
- `analytics_diagnosis_frequency`

Use `security_invoker` views where applicable and keep access aligned with RLS/role policy.

## Suggested Dashboard Sections

### Operations Overview

- Today and selected-period service counts.
- Active patients.
- New registrations.
- Waiting consultations.
- Pending labs.
- Pending follow-ups.
- Pending prescriptions.

### Staff Workflow Activity

- Activity by role.
- Activity by module.
- Completed workflow actions by period.
- Audit Log shortcut for detailed review.

### Clinical Trends

- Common diagnoses.
- Common chief complaints.
- Diagnosis trend over time.
- Age and sex distribution for aggregate trends.

### Health Center Performance

- Intake to consultation volume.
- Lab request completion.
- Prescription dispensing.
- Follow-up completion.
- FHSIS category activity.

## Implementation Phases

### Phase 1: Analytics Requirements Confirmation

- Confirm Admin and Doctor read-only scope.
- Confirm required date ranges.
- Confirm which metrics are operational, clinical, or report-related.
- Confirm no official PhilHealth compliance claims without exact specifications.

### Phase 2: Data Inventory And Metric Mapping

- Map each proposed metric to existing tables and fields.
- Mark unreliable metrics caused by free-text or missing timestamps.
- Define aggregate privacy thresholds.
- Identify indexes needed for date, status, and role filters.

### Phase 3: SQL-First Aggregate Layer

SQL changes required.

- Draft aggregate views or RPC functions.
- Add required indexes.
- Test query plans.
- Ensure aggregate queries return bounded datasets.
- Verify role authorization and RLS behavior.

### Phase 4: Read-Only Dashboard UI

Application changes required.

- Add Admin/Doctor Analytics route or workspace entry only after approval.
- Use existing clinical product language and table/card primitives.
- Keep charts restrained and readable.
- Add loading, empty, error, and permission-denied states.

### Phase 5: Privacy And Security QA

- Confirm unauthorized roles cannot access analytics.
- Confirm small cohorts are suppressed if configured.
- Confirm no patient identifiers appear in aggregate views.
- Confirm errors are non-technical.
- Confirm audit logging for exports if export is implemented.

### Phase 6: Performance QA

- Test common date ranges.
- Test large datasets.
- Confirm indexes are used.
- Confirm no dashboard card performs unbounded raw reads.
- Run production build and role-based QA.
