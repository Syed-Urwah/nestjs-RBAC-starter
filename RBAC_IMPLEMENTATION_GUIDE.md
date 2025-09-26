# Role-Based Access Control (RBAC) Implementation Guide

This guide provides a step-by-step process for implementing a Role-Based Access Control (RBAC) system in a NestJS project, based on a common and robust pattern.

## Key Concepts

*   **Guards:** Middleware that determines if a request can proceed.
*   **Decorators:** A way to attach metadata (like required roles) to your API endpoints.
*   **JWT (JSON Web Tokens):** A token-based authentication method where the user's roles can be stored directly in the token payload.

---

### Step 1: Define Your Roles

First, create a central, definitive list of all possible roles in your system. Using a TypeScript `enum` is the best practice as it prevents typos and keeps your roles consistent.

**Action:** Create a file at `src/auth/roles.enum.ts`.

```typescript
// src/auth/roles.enum.ts
export enum Role {
  User = 'user',
  Admin = 'admin',
  Moderator = 'moderator',
}
```

---

### Step 2: Associate Roles with Users

Your `User` entity in the database needs a way to be associated with these roles. A simple and effective way is to add a `roles` array column.

**Action:** Modify your `User` entity.

```typescript
// src/user/user.entity.ts (Example)
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../auth/roles.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // ... other columns like email, password

  @Column({
    type: 'simple-array', // Or another appropriate type for your DB
    default: [Role.User],
  })
  roles: Role[];
}
```

---

### Step 3: Include Roles in the JWT Payload

When a user logs in, your `AuthService` generates a JWT. This token's payload is the perfect place to store the user's roles. This avoids needing to query the database for the user's roles on every single API request.

**Action:** In your `AuthService`, add the `roles` to the JWT payload.

```typescript
// src/auth/auth.service.ts (Inside a login method)
async login(user: any) {
  const payload = {
    username: user.username,
    sub: user.id,
    roles: user.roles, // <-- ADD THIS LINE
  };
  return {
    access_token: this.jwtService.sign(payload),
  };
}
```

---

### Step 4: Create a Roles Decorator

This special decorator will be used to specify which roles are required to access a particular endpoint.

**Action:** Create a file at `src/auth/roles.decorator.ts`.

```typescript
// src/auth/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from './roles.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

---

### Step 5: Implement the Roles Guard

This is the core of the RBAC logic. The guard will run on every request to a protected endpoint. It extracts the roles required (from the decorator) and the roles the user has (from the JWT) and compares them.

**Action:** Create a file at `src/auth/roles.guard.ts`.

```typescript
// src/auth/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './roles.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get the roles required for this endpoint from the @Roles decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the endpoint doesn't require any specific roles, allow access
    if (!requiredRoles) {
      return true;
    }

    // 2. Get the user object (and its roles) from the request.
    // This user object is attached by the authentication guard (e.g., JwtAuthGuard).
    const { user } = context.switchToHttp().getRequest();

    // 3. Compare the user's roles with the roles required by the endpoint.
    // The `some` method returns true if at least one of the user's roles is in the requiredRoles array.
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

---

### Step 6: Apply the Guard and Decorator to Your Controllers

Finally, protect your endpoints. You will typically use two guards: the `JwtAuthGuard` (or equivalent) to first ensure the user is logged in, and then your new `RolesGuard` to check their permissions.

**Action:** Update a controller to protect an endpoint.

```typescript
// Example in a controller file
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard'; // Your main auth guard
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { Role } from './auth/roles.enum';

@Controller('admin')
// Apply guards to the entire controller
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {

  @Get('dashboard')
  @Roles(Role.Admin, Role.Moderator) // This endpoint requires Admin OR Moderator role
  getDashboard() {
    return { message: 'Welcome to the Admin & Moderator Dashboard!' };
  }

  @Get('users')
  @Roles(Role.Admin) // This endpoint requires ONLY the Admin role
  getAllUsers() {
    return { message: 'Here is the list of all users.' };
  }
}
```
