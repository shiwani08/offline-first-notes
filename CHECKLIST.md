# Software Planning & Security Checklist

## 1. Product Requirements (PRD)

### Problem Statement

What problem does the software solve?

### Target Users

Who will use it?

### Core Features

* Feature 1
* Feature 2
* Feature 3

### Success Metrics

* Number of users
* User retention
* Performance goals

---

## 2. User Flow

### Primary Flow

User → Sign Up → Verify Account → Dashboard → Core Feature → Success

### Edge Cases

* Invalid input
* Network failure
* API failure
* Permission denied
* Session expired

---

## 3. Data Flow

### Data Journey

User Input
↓
Frontend Validation
↓
Backend Validation
↓
Database Storage
↓
Analytics/Logs
↓
User Response

### Questions

* Where is data created?
* Where is it stored?
* Who can access it?
* Who can modify it?
* Who can delete it?

---

## 4. Database Design

### Entities

#### Users

* id
* name
* email
* created_at

#### Other Tables

* Table Name
* Fields
* Relationships

### Rules

* Unique fields
* Required fields
* Indexed fields
* Soft delete vs hard delete

---

## 5. Security Review

### Authentication

* Email/Password
* OAuth
* MFA (if required)

### Authorization

Define what each role can access.

| Action            | User | Admin |
| ----------------- | ---- | ----- |
| View Data         | Yes  | Yes   |
| Edit Own Data     | Yes  | Yes   |
| Edit Others' Data | No   | Yes   |

### Security Threats

* SQL Injection
* XSS
* CSRF
* Brute Force Attacks
* Data Leakage
* Broken Authentication

---

## 6. Sensitive Data Inventory

### Data Collected

| Data Type | Required | Storage Method |
| --------- | -------- | -------------- |
| Email     | Yes      | Encrypted      |
| Password  | Yes      | Hashed         |
| Phone     | Optional | Encrypted      |

### Never Store

* Plain-text passwords
* OTPs after validation
* Access tokens in logs
* Payment details unless necessary

---

## 7. API Specification

### Endpoint Example

POST /login

Request:
{
email,
password
}

Response:
{
token,
user
}

### Validation Rules

* Required fields
* Length limits
* Rate limits

---

## 8. Error Handling

### User-Friendly Errors

* Invalid credentials
* Session expired
* Resource not found
* Server unavailable

### Avoid Exposing

* Database errors
* Stack traces
* Internal server details

---

## 9. Logging Policy

### Log

* User ID
* Request ID
* Endpoint
* Timestamp
* Error Code

### Do Not Log

* Passwords
* Tokens
* OTPs
* Sensitive personal information

---

## 10. Privacy & Compliance

### User Rights

* Delete account
* Export data
* Update personal information

### Data Retention

* Define how long data is stored
* Define deletion policies

---

## 11. Testing Plan

### Unit Testing

* Business logic
* Validation
* Utility functions

### Integration Testing

* API + Database
* Authentication

### End-to-End Testing

* Signup flow
* Login flow
* Core user journeys

---

## 12. Deployment & Monitoring

### Deployment Checklist

* Environment variables configured
* HTTPS enabled
* Database backups enabled
* Error tracking configured

### Monitoring

* Server health
* API failures
* Database performance
* Security alerts

---

# Final Pre-Launch Checklist

✓ Product requirements documented

✓ User flow reviewed

✓ Data flow mapped

✓ Database designed

✓ Authentication implemented

✓ Authorization verified

✓ Sensitive data secured

✓ API contracts documented

✓ Error handling tested

✓ Logging reviewed

✓ Privacy considerations addressed

✓ Automated tests passing

✓ Monitoring configured

✓ Backups enabled

✓ Production deployment reviewed
