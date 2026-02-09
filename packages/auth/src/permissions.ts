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

export const owner = ac.newRole({
  organization: ["read", "update", "delete"],
  project: ["read", "create", "update", "delete"],
  members: ["read", "invite", "remove", "update"],
  flags: ["read", "create", "update", "delete"],
  environments: ["read", "create", "update", "delete"],
  segments: ["read", "create", "update", "delete"],
  apiKeys: ["read", "create", "update", "delete"],
});

export const admin = ac.newRole({
  organization: ["read"],
  project: ["read", "create", "update", "delete"],
  members: ["read", "invite", "remove", "update"],
  flags: ["read", "create", "update", "delete"],
  environments: ["read", "create", "update", "delete"],
  segments: ["read", "create", "update", "delete"],
  apiKeys: ["read", "create", "update", "delete"],
});

export const member = ac.newRole({
  organization: ["read"],
  project: ["read"],
  members: ["read"],
  flags: ["read", "create", "update", "delete"],
  environments: ["read", "create", "update", "delete"],
  segments: ["read", "create", "update", "delete"],
  apiKeys: ["read"],
});

export const viewer = ac.newRole({
  organization: ["read"],
  project: ["read"],
  members: ["read"],
  flags: ["read"],
  environments: ["read"],
  segments: ["read"],
});
