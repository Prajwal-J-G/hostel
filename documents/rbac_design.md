# Role-Based Access Control (RBAC) Design

This document details the Role-Based Access Control (RBAC) system for the **RNSIT Hostel Management System**. To support enterprise-grade operations (ERP), the architecture shifts from broad role checks (e.g. `role === 'admin'`) to granular, namespace-based permissions (e.g. `room:update`). This allows dynamic permission updates and flexible auditing.

---

## 1. Permission Namespaces

Permissions are structured in a `resource:action` format:

| Namespace | Permission Name | Description |
| :--- | :--- | :--- |
| **Hostel** | `hostel:create` | Create a new hostel block |
| | `hostel:read` | View hostel profiles and blocks |
| | `hostel:update` | Edit hostel address or configuration |
| | `hostel:delete` | Remove a hostel block |
| **Room** | `room:create` | Add a room to a hostel block |
| | `room:read` | View room details and occupancy |
| | `room:update` | Modify room capacity or details |
| | `room:delete` | Remove a room from the system |
| **Allocation**| `allocation:request` | Submit housing applications |
| | `allocation:read` | View request queues or assignment status |
| | `allocation:forward` | Admin check and forward request to Warden |
| | `allocation:approve` | Warden final approval of a student room request |
| **Complaint** | `complaint:create` | Lodge maintenance/mess tickets |
| | `complaint:read` | View filed complaints |
| | `complaint:update` | Update complaint description or category |
| | `complaint:resolve` | Close complaint and add warden remarks |
| **Menu & Kitchen** | `menu:read` | View the weekly mess menu |
| | `menu:update` | Update mess weekly breakfast/lunch/dinner schedules |
| | `inventory:read` | View food ingredient stock balances |
| | `inventory:create` | Register new raw materials/items in kitchen |
| | `inventory:update` | Record inventory additions (IN) and consumption (OUT) |
| **Payment** | `payment:read` | View payment invoice ledgers and dues |
| | `payment:create` | Issue invoices/bills (Automated/Admin) |
| | `payment:pay` | Record transaction IDs for fee payment |
| | `payment:verify` | Verify transaction codes against bank ledgers |
| **Broadcast** | `broadcast:create` | Publish announcements targeting hostels/genders |
| | `broadcast:read` | Read notification alerts |
| **Messaging** | `message:send` | Send peer private messages |
| | `message:read` | View received private messages |

---

## 2. Role-Permission Matrix

The default role configurations mapped to permissions are as follows:

| Permission | Student | Chef / Mess Manager | Warden | Admin |
| :--- | :---: | :---: | :---: | :---: |
| `hostel:create` | ❌ | ❌ | ❌ | ✅ |
| `hostel:read` | ✅ | ✅ | ✅ | ✅ |
| `hostel:update` | ❌ | ❌ | ❌ | ✅ |
| `hostel:delete` | ❌ | ❌ | ❌ | ✅ |
| `room:create` | ❌ | ❌ | ✅ | ✅ |
| `room:read` | ✅ | ✅ | ✅ | ✅ |
| `room:update` | ❌ | ❌ | ✅ | ✅ |
| `room:delete` | ❌ | ❌ | ✅ | ✅ |
| `allocation:request` | ✅ | ❌ | ❌ | ❌ |
| `allocation:read` | ✅ | ❌ | ✅ | ✅ |
| `allocation:forward` | ❌ | ❌ | ❌ | ✅ |
| `allocation:approve` | ❌ | ❌ | ✅ | ❌ |
| `complaint:create` | ✅ | ❌ | ❌ | ❌ |
| `complaint:read` | ✅ | ❌ | ✅ | ✅ |
| `complaint:update` | ✅ | ❌ | ❌ | ❌ |
| `complaint:resolve` | ❌ | ❌ | ✅ | ❌ |
| `menu:read` | ✅ | ✅ | ✅ | ✅ |
| `menu:update` | ❌ | ✅ | ✅ | ❌ |
| `inventory:read` | ❌ | ✅ | ✅ | ❌ |
| `inventory:create` | ❌ | ✅ | ✅ | ❌ |
| `inventory:update` | ❌ | ✅ | ✅ | ❌ |
| `payment:read` | ✅ | ❌ | ❌ | ✅ |
| `payment:create` | ❌ | ❌ | ❌ | ✅ |
| `payment:pay` | ✅ | ❌ | ❌ | ❌ |
| `payment:verify` | ❌ | ❌ | ❌ | ✅ |
| `broadcast:create` | ❌ | ❌ | ✅ | ✅ |
| `broadcast:read` | ✅ | ✅ | ✅ | ✅ |
| `message:send` | ✅ | ✅ | ✅ | ✅ |
| `message:read` | ✅ | ✅ | ✅ | ✅ |

*Note: ✅ denotes full access, and ❌ denotes denied access.*

---

## 3. Database Representation

Permissions are loaded dynamically from the PostgreSQL database using join relationships:

```sql
-- Query to retrieve all permissions for a user:
SELECT DISTINCT p.name 
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON rp.role_id = r.id
JOIN user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = $1;
```

---

## 4. JWT & Authentication Payload

Upon successful login, the **Auth Service** generates a signed JWT. To minimize downstream database hits in a microservice framework, user roles and granular permissions are encoded directly into the JWT token payload.

### JWT Payload Example:
```json
{
  "sub": "b2f67219-c70a-4a6f-b2fd-940081d6adbc",
  "name": "Arjun Sharma",
  "email": "arjun.sharma@rnsit.edu",
  "usn": "1RN24CS021",
  "gender": "male",
  "roles": ["student"],
  "permissions": [
    "hostel:read",
    "room:read",
    "allocation:request",
    "allocation:read",
    "complaint:create",
    "complaint:read",
    "complaint:update",
    "menu:read",
    "payment:read",
    "payment:pay",
    "broadcast:read",
    "message:send",
    "message:read"
  ],
  "iat": 1787670000,
  "exp": 1787756400
}
```

---

## 5. TypeScript Middleware Implementation

Below is a reference implementation of the JWT validation and permission checking middleware in TypeScript. This runs on the **API Gateway** or inside individual microservices.

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface UserPayload {
  sub: string;
  name: string;
  email: string;
  usn?: string;
  gender: 'male' | 'female' | 'other';
  roles: string[];
  permissions: string[];
}

// Extend Express Request types
declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
    req.currentUser = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const hasPermission = req.currentUser.permissions.includes(permission);
    if (!hasPermission) {
      return res.status(403).json({ message: `Access denied: missing permission '${permission}'` });
    }

    next();
  };
};
```
