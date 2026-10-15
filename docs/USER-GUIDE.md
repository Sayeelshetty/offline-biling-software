# Offline Billing Software – User Guide

## 1. Introduction

Offline Billing Software is a desktop POS and billing application designed for retail businesses.

The application is built around an offline-first approach so critical billing operations can continue without an internet connection.

Main capabilities include:

- Login
- Dashboard
- Product management
- Product search
- Barcode/product-code search
- Billing
- Inventory management
- Customer management
- Payment management
- Invoice generation
- PDF download
- Invoice sharing
- Reports
- Backup and restore
- Cloud synchronization
- Responsive/mobile-friendly interface

Pending local changes are synchronized automatically when internet connectivity
returns. The application also uploads a full local database backup when it
starts online or reconnects. If the cloud service is temporarily unavailable,
the backup is retried while the application remains online.

---

## 2. Starting the Application

Start the application using the project's development command:

```text
npm run dev