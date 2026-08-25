# Migration & Implementation Plan

This document outlines the step-by-step action plan to migrate the existing Javascript/MongoDB monolith into a TypeScript/PostgreSQL-based microservices architecture. It includes the directory structure, environment setup, database migration strategy, and development phases.

---

## 1. Directory Structure

We will transition the codebase to a monorepo structure. This makes it easy to maintain type definitions (e.g. user payloads, events) in a shared folder while keeping the microservices isolated.

```
/home/prajwal/holy_SHIT/hostel/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── services/
│   │   ├── gateway/                  # Express Gateway / Reverse Proxy (TypeScript) - Port 5000
│   │   ├── auth-service/             # Auth, RBAC, Users - Port 5001
│   │   ├── hostel-service/           # Hostels, Rooms - Port 5002
│   │   ├── allocation-service/       # Requests, room allocations - Port 5003
│   │   ├── billing-service/          # Invoicing & Payments - Port 5004
│   │   ├── messaging-service/        # Private chat & Broadcasts (WS/HTTP) - Port 5005
│   │   └── kitchen-service/          # Weekly Menus & Inventory - Port 5006
│   └── shared/                       # Shared models, middlewares, error handlers
├── documents/                        # System Design & KB documents
├── docker-compose.yml                # Launches PostgreSQL & RabbitMQ locally
├── package.json                      # Monorepo workspace config
└── frontend/                         # SvelteKit App (already TS, needs client config changes)
```

---

## 2. Dev Infrastructure Setup (Docker Compose)

To spin up dependency servers quickly, we will use a root-level `docker-compose.yml` defining PostgreSQL and RabbitMQ.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: hostel-db
    environment:
      POSTGRES_DB: hostel_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret_db_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: hostel-broker
    ports:
      - "5672:5672"   # AMQP protocol
      - "15672:15672" # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmqdata:/var/lib/rabbitmq

volumes:
  pgdata:
  rabbitmqdata:
```

---

## 3. Phased Implementation Roadmap

### Phase 1: Workspace Initialization (Target: 1-2 Days)
- [ ] Create root-level monorepo `package.json` with workspaces.
- [ ] Configure root `docker-compose.yml` for PostgreSQL and RabbitMQ.
- [ ] Establish the `backend/shared` package.
  - [ ] Write TypeScript interface definitions (`User`, `Room`, `Payment`, `Inventory`).
  - [ ] Write centralized Error Handling classes (`CustomError`, `BadRequestError`, `UnauthorizedError`).
  - [ ] Write JWT Validation and Permission Check Middlewares.

### Phase 2: Schema Migrations & Seeding (Target: 1 Day)
- [ ] Set up migrations using an ORM like **Prisma** or query builder like **Knex**.
- [ ] Write database initialization scripts implementing constraints and triggers:
  - `trg_sync_room_occupancy` (Room capacity-sync automation).
  - `trg_process_inventory_tx` (Kitchen inventory auto-update & warning trigger).
- [ ] Write seed script to populate default roles and permissions, including `chef` / `mess_manager` roles.

### Phase 3: Auth Service & API Gateway (Target: 2 Days)
- [ ] Build the **API Gateway**:
  - Routing rules mapping `/api/auth/*` to Auth Service, `/api/rooms/*` to Hostel Service, `/api/kitchen/*` to Kitchen Service, etc.
  - Extract JWT from Bearer header and attach standard user headers.
- [ ] Implement **Auth & Identity Service**:
  - Setup Express, TypeScript, and Prisma/pg connection.
  - Register route (hashes passwords and creates user record).
  - Login route (validates email, signs JWT with roles and permission arrays).
  - Profile retrieval endpoints.

### Phase 4: Asset & Request Pipeline Services (Target: 3 Days)
- [ ] Implement **Hostel & Room Service**:
  - CRUD for Hostels and Rooms.
- [ ] Implement **Allocation Service**:
  - Request submission endpoint (Student).
  - View requests queue.
  - Request Forward endpoint (Admin).
  - Request Approval endpoint (Warden).
  - Integration with RabbitMQ client:
    - Publish `student.request.submitted` on submission.
    - Publish `student.request.approved` on Warden approval.
- [ ] Implement **Allocation Worker**:
  - Listens to `student.request.approved` event and creates a record in `room_allocations` in PostgreSQL.

### Phase 5: Mess, Kitchen & Billing Services (Target: 3 Days)
- [ ] Implement **Kitchen & Mess Service**:
  - Endpoint for weekly menu retrieval (`GET /kitchen/menu`) and edits (`PUT /kitchen/menu` - warden/chef).
  - Endpoint for creating inventory items (`POST /kitchen/inventory/items`).
  - Endpoint for posting transactions (`POST /kitchen/inventory/transactions`), which triggers the SQL calculation function.
  - Publish `kitchen.inventory.low` event if transaction quantity dips below minimum threshold.
  - Publish `kitchen.menu.updated` event when weekly menu is changed.
- [ ] Implement **Billing & Payment Service**:
  - Listens to `student.request.approved` to generate fee invoices in `payments`.
  - Endpoint for students to submit a Transaction ID.
  - Endpoint for Admins to verify a payment, publishing `payment.settled`.
- [ ] Implement **Notification & Message Service**:
  - Listen to `student.request.submitted`, `student.request.approved`, `payment.settled`, and `kitchen.inventory.low` events to broadcast real-time WebSockets notifications or emails.
  - Handle peer-to-peer private messaging CRUD.
- [ ] Implement **Complaint Service**:
  - Standard ticket creation, list filtering, and resolution workflows.

### Phase 6: Frontend Integration & Verification (Target: 1 Day)
- [ ] Reconfigure SvelteKit client API base URI:
  - Point SvelteKit endpoints to run through the API Gateway (Port 5000) instead of the old monolithic backend.
  - Update authentication logic to store client JWT and decode roles/permissions.
- [ ] Perform E2E flow verification testing.
