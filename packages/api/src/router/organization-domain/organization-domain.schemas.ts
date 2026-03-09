import z from "zod/v4";

export type ListDomainsInput = z.infer<typeof listDomainsSchema>;
export const listDomainsSchema = z.object({
  organizationId: z.uuid(),
});

export type RemoveDomainInput = z.infer<typeof removeDomainSchema>;
export const removeDomainSchema = z.object({
  organizationId: z.uuid(),
  domainId: z.uuid(),
});

export type GetOrgsByDomainInput = z.infer<typeof getOrgsByDomainSchema>;
export const getOrgsByDomainSchema = z.object({});

export type JoinByDomainInput = z.infer<typeof joinByDomainSchema>;
export const joinByDomainSchema = z.object({
  organizationId: z.uuid(),
});
