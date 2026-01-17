import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  organization: ["read", "update", "delete"],
  project: ["read", "create", "update", "delete"],
  members: ["read", "invite", "remove", "update"],
  flags: ["read", "create", "update", "delete"],
  environments: ["read", "create", "update", "delete"],
  segments: ["read", "create", "update", "delete"],
  apiKeys: ["read", "create", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

// Owner: Full access - can manage everything including organization deletion and owner management
export const owner = ac.newRole({
  organization: ["read", "update", "delete"],
  project: ["read", "create", "update", "delete"],
  members: ["read", "invite", "remove", "update"],
  flags: ["read", "create", "update", "delete"],
  environments: ["read", "create", "update", "delete"],
  segments: ["read", "create", "update", "delete"],
  apiKeys: ["read", "create", "update", "delete"],
});

// Admin: Can manage all resources and members (except owners), but cannot delete organization
export const admin = ac.newRole({
  organization: ["read"],
  project: ["read", "create", "update", "delete"],
  members: ["read", "invite", "remove", "update"],
  flags: ["read", "create", "update", "delete"],
  environments: ["read", "create", "update", "delete"],
  segments: ["read", "create", "update", "delete"],
  apiKeys: ["read", "create", "update", "delete"],
});

// Member: Can create and edit content (flags, environments, segments) but cannot manage projects, members, or organization
export const member = ac.newRole({
  organization: ["read"],
  project: ["read"],
  members: ["read"],
  flags: ["read", "create", "update", "delete"],
  environments: ["read", "create", "update", "delete"],
  segments: ["read", "create", "update", "delete"],
  apiKeys: ["read"],
});

// Viewer: Read-only access - cannot make any changes
export const viewer = ac.newRole({
  organization: ["read"],
  project: ["read"],
  members: ["read"],
  flags: ["read"],
  environments: ["read"],
  segments: ["read"],
});
