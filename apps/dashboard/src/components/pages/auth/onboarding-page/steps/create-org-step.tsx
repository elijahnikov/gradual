"use client";

import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@gradual/ui/field";
import { Input } from "@gradual/ui/input";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Text } from "@gradual/ui/text";
import { RiArrowDownSFill } from "@remixicon/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import z from "zod/v4";
import { useTRPC } from "@/lib/trpc";

interface CreateOrgStepProps {
  onComplete: () => void;
  isLoading?: boolean;
}

const teamMemberRoles = ["admin", "member", "viewer"] as const;

const teamMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(teamMemberRoles),
});

const slugRegex = /^[a-z0-9-]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createOrgSchema = z.object({
  orgName: z.string().min(1, "Organization name is required"),
  orgSlug: z
    .string()
    .min(1, "Organization slug is required")
    .regex(
      slugRegex,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
  projectName: z.string().min(1, "Project name is required"),
  projectSlug: z
    .string()
    .min(1, "Project slug is required")
    .regex(
      slugRegex,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
  teamMembers: z.array(teamMemberSchema),
});

export function CreateOrgStep({
  onComplete,
  isLoading = false,
}: CreateOrgStepProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const _createOrg = useMutation(trpc.organization.create.mutationOptions());
  const _createProject = useMutation(trpc.project.create.mutationOptions());

  const [currentEmailInput, setCurrentEmailInput] = useState("");

  const form = useForm({
    defaultValues: {
      orgName: "",
      orgSlug: "",
      projectName: "",
      projectSlug: "",
      teamMembers: [] as Array<{
        email: string;
        role: "owner" | "admin" | "member" | "viewer";
      }>,
    },
    validators: {
      onSubmit: createOrgSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setIsSubmitting(true);

      try {
        // Create organization
        // const organization = await createOrg.mutateAsync({
        //   name: value.orgName,
        //   slug: value.orgSlug,
        // });

        // Create first project (requires organizationId in input)
        // await createProject.mutateAsync({
        //   name: value.projectName,
        //   slug: value.projectSlug,
        //   organizationId: organization.id,
        // });

        // Invalidate queries to refresh data
        await queryClient.invalidateQueries(
          trpc.organization.getAllByUserId.pathFilter()
        );

        // TODO: Send invitations to team members
        // You'll need to implement an invite mutation
        // For now, we'll just log it
        if (value.teamMembers && value.teamMembers.length > 0) {
          console.log("Team members to invite:", value.teamMembers);
        }

        onComplete();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create workspace"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Auto-generate slug from name
  // const handleOrgNameChange = (value: string, field: any) => {
  //   field.handleChange(value);
  //   const slug = value
  //     .toLowerCase()
  //     .replace(/[^a-z0-9]+/g, "-")
  //     .replace(/^-+|-+$/g, "");
  //   form.setFieldValue("orgSlug", slug);
  // };

  // const handleProjectNameChange = (value: string, field: any) => {
  //   field.handleChange(value);
  //   const slug = value
  //     .toLowerCase()
  //     .replace(/[^a-z0-9]+/g, "-")
  //     .replace(/^-+|-+$/g, "");
  //   form.setFieldValue("projectSlug", slug);
  // };

  return (
    <form
      className="relative h-full w-full space-y-6 pt-6"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="flex items-center gap-x-2">
        <form.Field
          children={(field) => {
            const hasErrors = field.state.meta.errors.length > 0;
            const shouldShowError =
              hasErrors &&
              (field.state.meta.isTouched || form.state.isSubmitted);
            return (
              <Field className="-mt-6" data-invalid={shouldShowError}>
                <FieldLabel>Organization</FieldLabel>
                <Input
                  aria-invalid={shouldShowError}
                  className="min-w-42"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Acme Inc."
                  value={field.state.value}
                />
                {shouldShowError && (
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => {
                        if (typeof error === "string") {
                          return error;
                        }
                        if (
                          error &&
                          typeof error === "object" &&
                          "message" in error
                        ) {
                          return String(error.message);
                        }
                        return String(error);
                      })
                      .join(", ")}
                  </FieldError>
                )}
              </Field>
            );
          }}
          name="orgName"
        />

        <form.Field
          children={(field) => {
            const hasErrors = field.state.meta.errors.length > 0;
            const shouldShowError =
              hasErrors &&
              (field.state.meta.isTouched || form.state.isSubmitted);
            return (
              <Field className="w-full" data-invalid={shouldShowError}>
                <Input
                  aria-invalid={shouldShowError}
                  className="w-full"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="acme-inc"
                  value={field.state.value}
                />

                {shouldShowError && (
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => {
                        if (typeof error === "string") {
                          return error;
                        }
                        if (
                          error &&
                          typeof error === "object" &&
                          "message" in error
                        ) {
                          return String(error.message);
                        }
                        return String(error);
                      })
                      .join(", ")}
                  </FieldError>
                )}
              </Field>
            );
          }}
          name="orgSlug"
        />
      </div>

      <div className="flex items-center gap-x-2">
        <form.Field
          children={(field) => {
            const hasErrors = field.state.meta.errors.length > 0;
            const shouldShowError =
              hasErrors &&
              (field.state.meta.isTouched || form.state.isSubmitted);
            return (
              <Field data-invalid={shouldShowError}>
                <FieldLabel>Project</FieldLabel>
                <Input
                  aria-invalid={shouldShowError}
                  className="min-w-42"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="My First Project"
                  value={field.state.value}
                />
                {shouldShowError && (
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => {
                        if (typeof error === "string") {
                          return error;
                        }
                        if (
                          error &&
                          typeof error === "object" &&
                          "message" in error
                        ) {
                          return String(error.message);
                        }
                        return String(error);
                      })
                      .join(", ")}
                  </FieldError>
                )}
              </Field>
            );
          }}
          name="projectName"
        />

        <form.Field
          children={(field) => {
            const hasErrors = field.state.meta.errors.length > 0;
            const shouldShowError =
              hasErrors &&
              (field.state.meta.isTouched || form.state.isSubmitted);
            return (
              <Field className="w-full" data-invalid={shouldShowError}>
                <div className="h-4" />
                <Input
                  aria-invalid={shouldShowError}
                  className="w-full"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="my-first-project"
                  value={field.state.value}
                />
                {shouldShowError && (
                  <FieldError>
                    {field.state.meta.errors
                      .map((error) => {
                        if (typeof error === "string") {
                          return error;
                        }
                        if (
                          error &&
                          typeof error === "object" &&
                          "message" in error
                        ) {
                          return String(error.message);
                        }
                        return String(error);
                      })
                      .join(", ")}
                  </FieldError>
                )}
              </Field>
            );
          }}
          name="projectSlug"
        />
      </div>

      <div className="mt-6 space-y-4">
        <Field>
          <FieldLabel>
            Invite team members{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </FieldLabel>
          <FieldDescription>
            Press Enter to add a teammate to the list
          </FieldDescription>
        </Field>

        <form.Field
          children={(field) => {
            const teamMembers = field.state.value || [];

            const handleAddMember = () => {
              const email = currentEmailInput.trim();
              if (!email) {
                return;
              }

              if (!emailRegex.test(email)) {
                return;
              }

              if (teamMembers.some((m) => m.email === email)) {
                return;
              }

              field.handleChange([
                ...teamMembers,
                { email, role: "member" as const },
              ]);
              setCurrentEmailInput("");
            };

            const handleKeyDown = (
              e: React.KeyboardEvent<HTMLInputElement>
            ) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddMember();
              }
            };

            const handleRemoveMember = (index: number) => {
              field.handleChange(teamMembers.filter((_, i) => i !== index));
            };

            const handleRoleChange = (
              index: number,
              role: "owner" | "admin" | "member" | "viewer"
            ) => {
              const updated = [...teamMembers];
              if (updated[index]) {
                updated[index] = { email: updated[index].email, role };
                field.handleChange(updated);
              }
            };

            return (
              <div className="space-y-2">
                <Input
                  onChange={(e) => setCurrentEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="teammate@example.com"
                  value={currentEmailInput}
                />

                {teamMembers.length > 0 && (
                  <div className="space-y-2">
                    {teamMembers.map((member, index) => (
                      <Card
                        className="flex items-center justify-between gap-2 rounded-md p-2"
                        key={index}
                      >
                        <Text weight="plus">{member.email}</Text>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  className="flex min-w-32 items-center justify-start gap-1 text-left text-xs"
                                  size="base"
                                  variant="outline"
                                >
                                  <RiArrowDownSFill className="size-4 shrink-0" />
                                  {member.role.charAt(0).toUpperCase() +
                                    member.role.slice(1)}
                                </Button>
                              }
                            >
                              {member.role}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {teamMemberRoles.map((role) => (
                                <DropdownMenuItem
                                  key={role}
                                  onClick={() => handleRoleChange(index, role)}
                                >
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            className="h-6 w-6 p-0"
                            onClick={() => handleRemoveMember(index)}
                            size="small"
                            variant="destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          }}
          name="teamMembers"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="absolute bottom-0 mt-auto flex w-full gap-2 pt-4">
        <LoadingButton
          className="w-full text-[13px]"
          loading={isSubmitting || isLoading}
          size="base"
          type="submit"
          variant="gradual"
        >
          Continue
        </LoadingButton>
      </div>
    </form>
  );
}
