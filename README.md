# MEDISENS

**MEDISENS** is a secure, role-based Healthcare Information System / Electronic Medical Record (EMR) prototype designed for the **Malvar Rural Health Unit (RHU)**. It supports digital patient records, consultation workflows, initial intake, laboratory requests, pharmacy dispensing, census reporting, patient history tracking, audit logging, and soft archiving of inactive patient records.

This project was developed as an academic capstone system to help improve manual RHU workflows through a responsive, healthcare-focused, and role-based web application.

---

## Overview

Many RHU processes are still paper-based, which can lead to slow record retrieval, duplicate entries, difficult report preparation, and risk of lost patient history.

MEDISENS aims to address these issues through:

- Digital patient records
- Role-based access control
- Patient consultation workflow support
- Initial consultation and vital signs recording
- Laboratory request and result management
- E-prescription and pharmacy dispensing workflow
- Midwife census, maternal care, vaccination, and reporting support
- Patient history and transaction tracking
- Read-only audit logging for accountability
- Soft archiving for inactive patient records
- Data privacy notices aligned with the Philippine Data Privacy Act of 2012
- Responsive Progressive Web App-ready interface

---

## User Roles

MEDISENS supports the following role-based users:

- Admin
- Barangay Health Worker (BHW)
- Nurse
- Doctor
- Laboratory
- Pharmacist
- Midwife

Each role only has access to its approved modules and workflows based on the system’s use case design.

---

## Core Features

### Patient Records

- Patient registration and profile management
- Patient information preview
- Patient history viewing from Patient Records
- Consultation, initial consultation, laboratory, prescription, vaccination, and follow-up tracking
- Doctor-only **Consult** action from Patient Records
- Active and archived patient record handling

### Doctor Module

- Patient Records access
- Consultation Room workflow
- Consultation record creation and updates
- Patient history access during consultation
- Follow-up handling
- Audit Log access
- Archive Review access with read/review visibility where enabled

### Nurse Module

- Initial consultation workflow
- Vital signs and patient assessment recording
- Patient Records access
- Initial intake queue support

### Laboratory Module

- Requested tests viewing
- Laboratory result and finding management
- Right-side slide-out patient laboratory detail panel
- Status-based laboratory workflow

### Pharmacist Module

- Prescription viewing
- Prescription dispensing workflow
- Patient preview with improved readable layout
- Dispensing status handling

### Midwife Module

- Census Entry
- Maternal care validation
- Male patient restriction for Maternal Care entries
- Vaccination and follow-up support
- FHSIS/report generation features

### BHW Module

- Patient registration support
- Patient Records access
- Barangay-level patient workflow support

### Admin Module

- User management
- Secure account creation
- Audit Log access
- Archive Review workspace
- System oversight

### Audit Log

- Read-only audit trail for Admin and Doctor users
- Tracks important actions such as login/logout, patient updates, consultations, laboratory actions, pharmacy actions, report generation, and archive/restore activity
- Uses a Supabase Edge Function for secure audit log insertion
- Prevents users from editing or deleting audit entries

### Patient Record Archiving

- Soft archive only; patient records are not moved or deleted
- Preserves all existing patient relationships and medical history
- Supports archive review for inactive patient records
- Supports archive and restore actions with required reasons
- Uses archive event logging through `patient_archive_events`
- Uses Audit Log integration for system-wide accountability
- Archive/restore actions are protected through a Supabase Edge Function

---

## Tech Stack

- **Frontend:** Vite, React, TypeScript
- **Styling:** CSS, custom design system, reusable UI components
- **Backend / Database:** Supabase
- **Authentication:** Supabase Auth
- **Serverless Functions:** Supabase Edge Functions
- **Version Control:** Git and GitHub

---

## Project Structure

```txt
MEDISENS/
├── pages/
├── src/
│   ├── app/
│   ├── assets/
│   ├── components/
│   ├── design-system/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   ├── styles/
│   └── types/
├── supabase/
│   └── functions/
├── docs/
├── README.md
├── package.json
└── vite.config.ts
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Pa-keys/thesis-templates.git
cd thesis-templates
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file in the project root.

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not commit real API keys, service role keys, or credentials.

### 4. Run the Development Server

```bash
npm run dev
```

### 5. Build the Project

```bash
npm run build
```

---

## Supabase Edge Functions

MEDISENS uses Supabase Edge Functions for privileged and sensitive server-side operations.

Current functions include:

- `create-user` — secure Admin-created user accounts
- `create-audit-log` — secure audit log inserts
- `archive-patient-record` — secure Admin-only patient archive/restore actions

Deploy functions using:

```bash
npx supabase functions deploy create-user
npx supabase functions deploy create-audit-log
npx supabase functions deploy archive-patient-record
```

Set required Supabase secrets:

```bash
npx supabase secrets set PROJECT_URL="your_project_url"
npx supabase secrets set ANON_KEY="your_anon_key"
npx supabase secrets set SERVICE_ROLE_KEY="your_service_role_key"
```

Never expose the service role key in frontend code.

---

## Data Privacy Notice

MEDISENS handles personal and health information in accordance with the **Philippine Data Privacy Act of 2012 (Republic Act No. 10173)**.

Patient information must only be collected, accessed, stored, and processed for authorized RHU healthcare purposes. User activities may be logged for accountability, security, and system monitoring.

---

## Security and Access Control

MEDISENS incorporates multiple security measures to protect patient information and maintain system integrity:

- Role-based module visibility and access control
- Supabase authentication
- Secure administrator-controlled user account creation
- Read-only Audit Log for authorized users
- Server-side audit logging through Supabase Edge Functions
- Server-side archive/restore protection through Supabase Edge Functions
- User-friendly error messages without exposing raw technical details
- Sensitive clinical information is not intentionally stored in audit metadata
- Soft archiving instead of deleting or moving patient records

---

## Development Standards

The project uses documentation and standards to guide consistent development:

- `README.md` — project overview and setup
- `UI-SKILL.md` — MEDISENS healthcare UI/UX design standard
- `DESIGN_SYSTEM.md` — visual system and component design direction
- `UPDATE.md` — implementation and change tracking
- `SECURITY_ROADMAP.md` — planned security hardening
- `ARCHIVING_ROADMAP.md` — patient record archiving plan
- `ANALYTICS_ROADMAP.md` — RHU analytics and performance dashboard plan

Before committing changes, run:

```bash
npm run build
git status
```

Recommended commit workflow:

```bash
git add .
git commit -m "your commit message"
git push origin your-branch-name
```

---

## Current Development Notes

MEDISENS is under active development and refinement. Recent major improvements include:

- Healthcare-oriented UI/UX refinement
- Read-only Audit Log for Admin and Doctor users
- Patient history improvements
- Safer error handling and UTF-8 cleanup
- Soft patient record archiving support
- Archive Review workspace
- Supabase Edge Functions for sensitive operations
- Data Privacy Act notices
- Role-based UI consistency improvements

Remaining recommended work includes:

- Full authenticated browser QA for every role
- Final RLS hardening review
- `last_activity_at` instrumentation across all patient-linked write paths
- RHU Analytics & Performance Dashboard
- Final Vercel staging/production deployment testing

---

## Academic Context

This system was developed as an undergraduate capstone project to demonstrate how a digital Healthcare Information System (HIS) can improve patient record management, clinical workflows, reporting, and accountability within a Rural Health Unit (RHU).

While MEDISENS has been designed with security, usability, and healthcare best practices in mind, additional security reviews, penetration testing, deployment hardening, and real-world validation are recommended before production deployment in an actual healthcare facility.

---

## Contributors

- **Ivan Joseph V. Jaurigue**
- **Mark Jerome R. Kinchasan**
- **Jan Ernest Pacey P. Nario**

---

## License

This project is intended for **academic and research purposes only**. Unauthorized commercial use, redistribution, or deployment in a production healthcare environment without proper authorization and validation is not recommended.
