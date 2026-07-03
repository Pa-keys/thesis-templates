# MEDISENS

**MEDISENS** is a secure, role-based Healthcare Information System / Electronic Medical Record (EMR) prototype designed for the **Malvar Rural Health Unit (RHU)**. It supports digital patient records, consultation workflows, laboratory requests, pharmacy dispensing, census reporting, patient history tracking, and audit logging.

This project was developed as an academic capstone system to help improve manual RHU workflows through a responsive and healthcare-focused web application.

---

## Overview

Many RHU processes are still paper-based, which can lead to slow record retrieval, duplicate entries, difficult report preparation, and risk of lost patient history.

MEDISENS aims to address these issues through:

- Digital patient records
- Role-based access control
- Patient consultation workflow support
- Laboratory request and result management
- E-prescription and pharmacy workflow support
- Midwife census and reporting support
- Patient history tracking
- Audit logging for accountability
- Responsive Progressive Web App-ready interface
- Data privacy notices aligned with the Philippine Data Privacy Act of 2012

---

## User Roles

MEDISENS supports the following users:

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
- Patient history viewing
- Consultation, initial consultation, lab, prescription, vaccination, and follow-up tracking
- Doctor-only Consult action from Patient Records

### Doctor Module

- Patient Records access
- Consultation Room workflow
- Consultation record creation and updates
- Patient history access during consultation
- Audit Log access

### Nurse Module

- Initial consultation workflow
- Vital signs and patient assessment recording
- Patient Records access

### Laboratory Module

- Requested tests viewing
- Laboratory results and findings management
- Right-side slide-out patient detail panel

### Pharmacist Module

- Prescription viewing
- Dispensing workflow
- Patient preview with optimized readable layout

### Midwife Module

- Census Entry
- Maternal care validation
- Vaccination and follow-up support
- Reporting features

### BHW Module

- Patient registration support
- Patient Records access
- Barangay-level patient workflow support

### Admin Module

- User management
- Secure account creation
- Audit Log access
- System oversight

### Audit Log

- Read-only audit trail for Admin and Doctor users
- Tracks important actions such as login/logout, patient updates, consultations, laboratory actions, pharmacy actions, and report generation
- Uses Supabase Edge Function for secure audit log insertion
- Prevents users from editing or deleting audit entries

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
├── package.json
├── vite.config.ts
└── README.md
```

---

## Data Privacy Notice

MEDISENS handles personal and health information in accordance with the **Philippine Data Privacy Act of 2012 (Republic Act No. 10173)**.

Patient information must only be collected, accessed, stored, and processed for authorized RHU healthcare purposes. User activities may be logged for accountability, security, and system monitoring.

---

## Security and Access Control

MEDISENS incorporates multiple security measures to protect patient information and maintain system integrity:

- Role-based module visibility and access control
- Secure authentication using Supabase Auth
- Read-only Audit Log for authorized users (Admin and Doctor)
- Server-side audit logging through Supabase Edge Functions
- User-friendly error messages without exposing internal system details
- Sensitive clinical information is not intentionally stored in audit metadata
- Secure administrator-controlled user account creation

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
