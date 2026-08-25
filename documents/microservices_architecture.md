# Microservices Architecture & ERP Messaging Redesign

This document outlines the architectural redesign of the **RNSIT Hostel Management System** from a monolithic application into a distributed, event-driven microservices architecture written in TypeScript. 

By separating duties, each service can be developed, tested, and scaled independently, using a centralized event messaging broker (like RabbitMQ or Redis Streams) to coordinate activities, mirroring enterprise ERP workflows.

---

## 1. Architectural Blueprint

The system adopts an API Gateway pattern for external entry, with internal services communicating synchronously via REST APIs and asynchronously via an event-driven message channel.

```
                  ┌──────────────────────┐
                  │   SvelteKit Client   │
                  └──────────┬───────────┘
                             │ HTTPS / WSS
                             ▼
                  ┌──────────────────────┐
                  │     API Gateway      │
                  └──────────┬───────────┘
                             │
  ┌──────────────────┬───────┼───────┬──────────────────┬─────────────────┐
  ▼                  ▼               ▼                  ▼                 ▼
┌──────────┐   ┌──────────┐    ┌──────────┐       ┌──────────┐      ┌──────────┐
│  Auth &  │   │ Hostel & │    │Allocation│       │ Payment  │      │ Kitchen  │
│ Identity │   │   Room   │    │ Service  │       │ Service  │      │  & Mess  │
│ Service  │   │ Service  │    │ (Housing)│       │ (Billing)│      │ Service  │
└────┬─────┘   └────┬─────┘    └────┬─────┘       └────┬─────┘      └────┬─────┘
     │              │               │                  │                 │
     │              │               │                  │                 │
     └──────────────┴───────┬───────┴──────────────────┴─────────────────┘
                            │
                            ▼
                   ┌──────────────────┐      ┌──────────────────┐
                   │  Message Broker  │      │ Notification &   │
                   │    (RabbitMQ)    │◄────►│ Private Message  │
                   │  [Event Channel] │      │  Service (WS)    │
                   └──────────────────┘      └──────────────────┘
```

---

## 2. Microservice Boundaries

The backend is split into 7 core services. Each service runs in TypeScript, holds its own database connection (sharing a PostgreSQL cluster but isolated via schemas/databases), and exports typed interfaces.

### 2.1. Auth & Identity Service (RBAC Core)
* **Responsibilities**: User signup, login, JWT token issuance, user profiles, profile changes, and permission evaluation. Supports roles: `admin`, `warden`, `chef`, and `student`.
* **Database Tables**: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`.
* **Synchronous Endpoints**:
  * `POST /auth/register` (User registration)
  * `POST /auth/login` (Returns JWT containing claims, roles, and granular permissions)
  * `GET /auth/me` (Profile retrieval)
  * `GET /auth/users/:id` (Fetch individual users)

### 2.2. Hostel & Room Service
* **Responsibilities**: Management of physical assets: Hostel blocks, room configurations, room capacities, occupied statuses.
* **Database Tables**: `hostels`, `rooms`.
* **Synchronous Endpoints**:
  * `POST /hostels` (Create hostel - admin)
  * `GET /hostels` (Fetch hostels)
  * `POST /rooms` (Create room in hostel - warden/admin)
  * `GET /rooms/:id` (Get room details, virtual availability)

### 2.3. Room Allocation Service (Housing Office)
* **Responsibilities**: Manages the admissions request pipeline. Handles student admission applications, administrative document checks, and warden approvals.
* **Database Tables**: `student_requests`, `room_allocations`.
* **Synchronous Endpoints**:
  * `POST /allocations/requests` (Student submits room request)
  * `POST /allocations/requests/:id/forward` (Admin forwards requests to warden)
  * `POST /allocations/requests/:id/approve` (Warden approves requests, triggers room allocation)
  * `GET /allocations/requests/forwarded` (Warden fetches incoming queue)

### 2.4. Payment & Billing Service (ERP Ledger)
* **Responsibilities**: Automating invoicing for hostel and mess fees, managing security deposits, logging transaction IDs, verifying payment gateways (e.g. Razorpay/Stripe), and tracking debt aging (dues/overdues).
* **Database Tables**: `payments`.
* **Synchronous Endpoints**:
  * `GET /payments/my-dues` (Student queries their pending dues)
  * `POST /payments/:id/pay` (Submit transaction receipt/ID)
  * `POST /payments/:id/verify` (Admin validates payment transaction)

### 2.5. Complaint Service
* **Responsibilities**: Maintenance, mess, and security ticket tracking. Enables student submission and warden actioning/commenting.
* **Database Tables**: `complaints`.
* **Synchronous Endpoints**:
  * `POST /complaints` (Student posts ticket)
  * `GET /complaints` (Warden views active tickets for their hostel)
  * `PUT /complaints/:id/resolve` (Warden resolves ticket, posts remarks)

### 2.6. Kitchen & Mess Service (New)
* **Responsibilities**: Managing weekly meal planners, raw material inventory ledgers, tracking stock levels, and food usage logs.
* **Database Tables**: `weekly_menus`, `daily_menus`, `inventory_items`, `inventory_transactions`.
* **Access Control**: Handled via `warden` and `chef` authorization tokens.
* **Synchronous Endpoints**:
  * `GET /kitchen/menu` (Retrieve weekly menu for a hostel - open to all)
  * `PUT /kitchen/menu` (Update weekly breakfast/lunch/dinner - warden/chef)
  * `GET /kitchen/inventory` (Fetch food stock levels - warden/chef)
  * `POST /kitchen/inventory/items` (Create inventory item e.g. "Rice" - warden/chef)
  * `POST /kitchen/inventory/transactions` (Add stock IN or record consumption OUT - chef)

### 2.7. Notification & Private Message Service
* **Responsibilities**: System communications. Handles broad notification logs (targeting genders or hostels) and handles 1-on-1 private messaging channels between students, admins, chefs, and wardens. Runs WebSockets for real-time delivery.
* **Database Tables**: `notifications`, `private_messages`.
* **Synchronous Endpoints**:
  * `POST /notifications/broadcast` (Publish global/gender/hostel notification)
  * `POST /messages/send` (Send private message)
  * `GET /messages/chat/:userId` (Fetch conversation thread)

---

## 3. ERP Event-Driven Messaging Channels

To mimic robust Enterprise Resource Planning (ERP) software, operations that trigger cascading changes are handled asynchronously through an event broker (e.g. **RabbitMQ**).

### 3.1. Key Events & Subscriber Actions

#### 1. Event: `student.request.approved`
* **Producer**: Allocation Service (when Warden clicks approve).
* **Consumers**:
  * **Hostel/Room Service (Worker)**: Receives the event, creates a record in `room_allocations` which auto-updates room vacancies.
  * **Payment Service**: Creates fee invoice in `payments` (status: `due`).
  * **Notification Service**: Sends admission welcome email.

#### 2. Event: `kitchen.inventory.low`
* **Producer**: Kitchen & Mess Service (published automatically when a consumption transaction drops stock quantity below `min_threshold`).
* **Consumers**:
  * **Notification Service**: Broadcasts alerts to the Warden of that hostel and the Chef’s dashboard to initiate stock replenishment.

#### 3. Event: `kitchen.menu.updated`
* **Producer**: Kitchen & Mess Service (when Weekly menu is altered).
* **Consumers**:
  * **Notification Service**: Notifies all students allocated to that hostel block of the updated meal schedule.

#### 4. Event: `payment.settled`
* **Producer**: Payment Service.
* **Consumers**:
  * **Allocation Service**: Finalizes request to admitted.
  * **Notification Service**: Broadcasts receipt confirmation.

---

## 4. API Gateway Setup

The **API Gateway** acts as the single point of entry. 
* **Routing**: Maps prefix paths to matching microservices (e.g. `/api/auth/*` -> `Auth Service`, `/api/kitchen/*` -> `Kitchen & Mess Service`).
* **Authentication**: Intercepts requests, validates the JWT, extracts claims, and forwards headers (e.g. `X-User-Id`, `X-User-Roles`, `X-User-Permissions`) downstream.
