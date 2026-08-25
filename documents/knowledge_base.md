# Current Codebase Audit & Knowledge Base

This document establishes the knowledge base for the existing **RNSIT Hostel Management Backend**. It summarizes the architectural components, entity models, endpoints, and identified gaps of the current codebase to serve as the baseline for our migration to a TypeScript-based microservices architecture running on PostgreSQL.

---

## 1. System Overview

The current system is a monolithic Express.js application written in JavaScript (ES Modules), configured with MongoDB (via Mongoose) as the database. It handles student housing operations, including student registration, room request submission, warden/admin approval workflows, billing tracking, complaints, weekly mess menus, and notifications.

### Folder Structure
* `backend/src/server.js`: Application entry point. Sets up middleware and routes.
* `backend/src/config/db.js`: Database configuration for MongoDB.
* `backend/src/models/`: Holds Mongoose schema files.
* `backend/src/routes/`: Route controllers mapping paths to handler methods.
* `backend/src/controllers/`: Business logic handlers.
* `backend/src/middleware/`: Authentication and permission checkers.
* `backend/src/utils/`: General helpers (e.g. error handling, password hashing).

---

## 2. Existing Schema Analysis (MongoDB)

The current schema uses MongoDB object IDs and custom string identifiers (`USN`) to relate entities. Below is a breakdown of the existing Mongoose models:

### 2.1. User Model (`User.model.js`)
* **usn** (String, Unique, Index): University Serial Number; used as the main identifier for student room assignments.
* **name** (String): Full name.
* **email** (String, Unique): E-mail address.
* **password** (String): Bcrypt hashed password.
* **room** (ObjectId -> Ref: Room): Currently assigned room.
* **role** (String, Enum): `student`, `warden`, `admin`.
* *Missing Fields*: The codebase controllers try to set `gender` and `accountStatus` in some endpoints, but they are not defined in the schema.

### 2.2. Hostel Model (`Hostel.model.js`)
* **name** (String): Hostel name.
* **address** (String): Physical location.
* **rooms** (Array of ObjectId -> Ref: Room): List of rooms under this hostel.
* **warden** (ObjectId -> Ref: User): Assigned warden for the hostel.

### 2.3. Room Model (`Room.model.js`)
* **number** (String): Room number (e.g. "101").
* **capacity** (Number): Max students allowed in the room.
* **hostel** (ObjectId -> Ref: Hostel): Hostel this room belongs to.
* **students** (Array of String -> Ref: User via USN): Assigned student USNs.
* **filled** (Number): Current count of occupied beds.
* *Hooks/Virtuals*: 
  * Virtual `availableBeds`: Calculated as `capacity - filled`.
  * Pre-save validation: Ensures `students.length <= capacity` and syncs `filled`.
  * Post-save: Adds the room to the hostel's `rooms` array and updates the assigned students' `room` reference in the User model.
  * Post-delete: Pulls the room from the hostel and unsets the student users' `room` references.

### 2.4. Complaint Model (`Complaint.models.js`)
* **student** (ObjectId -> Ref: User): Submitting student.
* **title** (String): Headline of the complaint.
* **description** (String): Detailed text.
* **category** (String, Enum): `maintenance`, `mess`, `security`, `other`.
* **status** (String, Enum): `pending`, `in-progress`, `resolved`, `closed`.
* **wardenRemarks** (String): Feedback left by the resolving warden.

### 2.5. Menu Model (`Menu.model.js`)
* **hostelId** (ObjectId -> Ref: Hostel, Unique): Each hostel has exactly one weekly menu document.
* **monday ... sunday**: Nested sub-documents containing:
  * **breakfast** (String)
  * **lunch** (String)
  * **dinner** (String)

### 2.6. Notification Model (`Notification.model.js`)
* **title** (String)
* **content** (String)
* **author** (ObjectId -> Ref: User)
* **genderTarget** (String, Enum): `male`, `female`.
* **targetHostel** (ObjectId -> Ref: Hostel, Nullable)

### 2.7. Payment Model (`Payment.model.js`)
* **student** (ObjectId -> Ref: User)
* **amount** (Number)
* **type** (String, Enum): `hostel_fee`, `mess_fee`, `security_deposit`, `other`.
* **status** (String, Enum): `paid`, `due`, `overdue`.
* **dueDate** (Date)
* **transactionId** (String, Nullable)
* **paymentDate** (Date, Nullable)

### 2.8. PrivateMessage Model (`PrivateMessage.model.js`)
* **sender** (ObjectId -> Ref: User)
* **recipient** (ObjectId -> Ref: User)
* **subject** (String): Defaults to "Payment Confirmation".
* **body** (String)
* **relatedStudentInfo**: Embedded sub-document with `{ name, email }`.
* **status** (String, Enum): `sent`, `read`, `actioned`.

### 2.9. StudentRequest Model (`StudentRequest.model.js`)
* **student** (ObjectId -> Ref: User): Requesting student.
* **hostel** (ObjectId -> Ref: Hostel): Requested hostel.
* **roomType** (String, Enum): `single`, `double`, `triple`, `dormitory`.
* **status** (String, Enum): `pending`, `verified`, `forwarded`, `approved`, `rejected`.
* **notes** (String): Remarks or verification metadata.

---

## 3. Routes & Authorization Setup

### 3.1. Current Routes
1. `/auth`: Maps to User registration, login, and user profile retrieval.
2. `/api/`: Sub-routes for users (GetAll, GetById, Update, Delete).
3. `/api/students`: Allows student to submit a housing/room request.
4. `/api/hostels`: Main hostel CRUD.
5. `/api/rooms`: Room CRUD (creation updates Hostels/Users dynamically).
6. `/api/gender-specific` (Draft): Incomplete gender zone checks `/boys-hostel` and `/female-zone`.

### 3.2. Authorization & RBAC
Currently, role permissions are hardcoded in a static config block in `backend/src/middleware/permissions.js`:
* `admin`: `['create_hostel', 'delete_hostel', 'view_all_users']`
* `warden`: `['view_hostel', 'approve_student', 'edit_room']`
* `student`: `['view_room', 'apply_hostel']`

Verification checks matching permission actions to these roles are run on individual routes. A separate `accessControl.js` checks roles and target genders against request claims.

---

## 4. Identified Gaps & Inconsistencies

1. **Schema Mismatches**:
   * Several controllers reference database fields (like `gender`, `accountStatus`, `approved`, `forwardedByAdmin`) that do not exist in the defined Mongoose models.
   * Type validation is loose, causing run-time bugs or partial schemas.
2. **Missing Controller/Route Logic**:
   * `allocation.routes.js` and `allocation.controller.js` are empty shells.
   * `admin.controller.js` references a non-existent `Request` model instead of `StudentRequest` (throwing errors in `verifyPayment`).
3. **Data Integrity Hazards**:
   * MongoDB relationships are manually synchronized in model save/delete hooks. If one query fails mid-execution, database records will enter an inconsistent state (e.g. a room assigned to a user that does not have that student's USN in its occupancy list). PostgreSQL with proper transaction boundaries and foreign keys will resolve this.
4. **Ineffective Role Management**:
   * RBAC rules are hardcoded in code rather than being dynamic or configured in a DB layer.
   * Express middleware intercepts roles, but roles are not granular enough to manage enterprise ERP resources safely.
