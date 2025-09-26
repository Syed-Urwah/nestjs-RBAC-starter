
# Dynamic Role-Based Access Control (RBAC) Guide

This guide explains how to evolve a static, enum-based RBAC system into a dynamic, database-driven one. This allows roles and their permissions to be managed at runtime via an API without requiring code changes or deployments.

## The Core Idea: From Enums to Entities

Instead of a hardcoded `enum`, you will create `Role` and `Permission` entities in your database. A `Role` becomes a collection of `Permissions`, and a `User` can be assigned multiple `Roles`.

---

### Step 1: Create `Role` and `Permission` Entities

Define the structure for roles and permissions in your database. A permission is a single atomic right (e.g., `edit-articles`), and a role is a named group of these permissions.

**Action:** Create `src/auth/entities/permission.entity.ts` and `src/auth/entities/role.entity.ts`.

```typescript
// src/auth/entities/permission.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // e.g., 'create-user', 'delete-post', 'view-dashboard'

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];
}
```

```typescript
// src/auth/entities/role.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Permission } from './permission.entity';
import { User } from '../../user/user.entity';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // e.g., 'Admin', 'Project Manager', 'Viewer'

  @ManyToMany(() => Permission, { cascade: true, eager: true }) // Eager load permissions with roles
  @JoinTable()
  permissions: Permission[];

  @ManyToMany(() => User, user => user.roles)
  users: User[];
}
```

---

### Step 2: Update the `User` Entity

Modify the `User` entity to establish a many-to-many relationship with the new `Role` entity.

**Action:** Update `src/user/user.entity.ts`.

```typescript
// src/user/user.entity.ts (Updated)
import { Entity, ManyToMany, JoinTable } from 'typeorm';
import { Role } from '../auth/entities/role.entity';
// ... other imports

@Entity()
export class User {
  // ... id, email, password columns

  @ManyToMany(() => Role, { eager: true }) // Eager load roles when you fetch a user
  @JoinTable()
  roles: Role[];
}
```
**Note:** You will need to create and run new database migrations to apply these entity changes.

---

### Step 3: Create a Role/Permission Management API

You now need endpoints (likely restricted to admins) to manage these roles and assign them to users.

**Example Endpoints:**
*   `POST /permissions` - Create a new permission (e.g., `{ "name": "edit-articles" }`).
*   `POST /roles` - Create a new role (e.g., `{ "name": "Editor" }`).
*   `POST /roles/:roleId/permissions/:permissionId` - Assign a permission to a role.
*   `POST /users/:userId/roles/:roleId` - Assign a role to a user.

---

### Step 4: Adapt the JWT Payload

When a user logs in, you must package their effective permissions into the JWT. This is a critical change for performance, as it prevents extra database lookups on every API call.

**Action:** Update your `AuthService`'s `login` method.

```typescript
// src/auth/auth.service.ts (Updated login method)
async login(user: any) {
  // The 'user' object is the TypeORM entity with its 'roles' and their 'permissions' eagerly loaded.

  // Extract all unique permission names from all of the user's roles.
  const permissions = user.roles.flatMap(role => role.permissions.map(p => p.name));
  const uniquePermissions = [...new Set(permissions)];

  const payload = {
    username: user.username,
    sub: user.id,
    roles: user.roles.map(role => role.name), // Keep role names for convenience
    permissions: uniquePermissions, // The crucial data for our guard
  };

  return {
    access_token: this.jwtService.sign(payload),
  };
}
```

---

### Step 5: Create a `PermissionsGuard`

The old `RolesGuard` is insufficient. A new guard is needed to check for specific permissions.

**Action:** Create `src/auth/permissions.decorator.ts` and `src/auth/permissions.guard.ts`.

```typescript
// src/auth/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const HasPermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
```

```typescript
// src/auth/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    // 'user.permissions' comes directly from the JWT payload we created in Step 4.
    const userPermissions = user.permissions || [];

    // Check if the user has ALL of the required permissions.
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}
```

---

### Step 6: Use the New Guard and Decorator

Finally, update your controllers to use the new, more granular permission-based system.

**Action:** Update a controller.

```typescript
// Example in a controller file
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { HasPermissions } from './auth/permissions.decorator';

@Controller('articles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ArticlesController {

  @Post()
  @HasPermissions('create-articles', 'edit-articles') // Requires BOTH permissions
  createOrUpdateArticle() {
    return { message: 'Article created/updated successfully.' };
  }
}
```
