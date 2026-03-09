import { eq } from "@gradual/db";
import { member, organization, organizationDomain } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import { and } from "drizzle-orm";
import type {
  ProtectedOrganizationTRPCContext,
  ProtectedTRPCContext,
} from "../../trpc";
import type {
  JoinByDomainInput,
  ListDomainsInput,
  RemoveDomainInput,
} from "./organization-domain.schemas";

const COMMON_EMAIL_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
  "zohomail.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
  "yandex.com",
  "yandex.ru",
  "tutanota.com",
  "tuta.com",
  "fastmail.com",
  "hey.com",
  "pm.me",
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
]);

export function isWorkDomain(domain: string): boolean {
  return !COMMON_EMAIL_PROVIDERS.has(domain.toLowerCase());
}

export function extractDomain(email: string): string | null {
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[1]) {
    return null;
  }
  return parts[1].toLowerCase();
}

export const listDomains = ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListDomainsInput;
}) => {
  return ctx.db.query.organizationDomain.findMany({
    where: eq(organizationDomain.organizationId, input.organizationId),
  });
};

export const removeDomain = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: RemoveDomainInput;
}) => {
  const [deleted] = await ctx.db
    .delete(organizationDomain)
    .where(
      and(
        eq(organizationDomain.id, input.domainId),
        eq(organizationDomain.organizationId, input.organizationId)
      )
    )
    .returning();

  if (!deleted) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Domain not found",
    });
  }

  return deleted;
};

export const getOrgsByDomain = async ({
  ctx,
}: {
  ctx: ProtectedTRPCContext;
}) => {
  const email = ctx.session.user.email;
  if (!email) {
    return [];
  }

  const domain = extractDomain(email);
  if (!(domain && isWorkDomain(domain))) {
    return [];
  }

  const domains = await ctx.db
    .select({
      organizationId: organizationDomain.organizationId,
      domain: organizationDomain.domain,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationLogo: organization.logo,
    })
    .from(organizationDomain)
    .innerJoin(
      organization,
      eq(organizationDomain.organizationId, organization.id)
    )
    .where(eq(organizationDomain.domain, domain));

  // Filter out orgs where user is already a member
  const orgIds = domains.map((d) => d.organizationId);
  if (orgIds.length === 0) {
    return [];
  }

  const existingMemberships = await ctx.db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(
      and(
        eq(member.userId, ctx.session.user.id),
        eq(member.organizationId, orgIds[0] as string)
      )
    );

  const memberOrgIds = new Set(
    existingMemberships.map((m) => m.organizationId)
  );

  return domains.filter((d) => !memberOrgIds.has(d.organizationId));
};

export const joinByDomain = async ({
  ctx,
  input,
}: {
  ctx: ProtectedTRPCContext;
  input: JoinByDomainInput;
}) => {
  const email = ctx.session.user.email;
  if (!email) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User email is required",
    });
  }

  const domain = extractDomain(email);
  if (!(domain && isWorkDomain(domain))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Email domain is not eligible for auto-join",
    });
  }

  // Verify the org has this domain registered
  const orgDomain = await ctx.db.query.organizationDomain.findFirst({
    where: and(
      eq(organizationDomain.organizationId, input.organizationId),
      eq(organizationDomain.domain, domain)
    ),
  });

  if (!orgDomain) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your email domain does not match this organization",
    });
  }

  // Check not already a member
  const existingMember = await ctx.db.query.member.findFirst({
    where: and(
      eq(member.organizationId, input.organizationId),
      eq(member.userId, ctx.session.user.id)
    ),
  });

  if (existingMember) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already a member of this organization",
    });
  }

  // Add as member
  const result = await ctx.authApi.addMember({
    body: {
      userId: ctx.session.user.id,
      role: "member",
      organizationId: input.organizationId,
    },
  });

  if (!result) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to join organization",
    });
  }

  // Set as active organization
  await ctx.authApi.setActiveOrganization({
    body: { organizationId: input.organizationId },
    headers: ctx.headers,
  });

  return result;
};
