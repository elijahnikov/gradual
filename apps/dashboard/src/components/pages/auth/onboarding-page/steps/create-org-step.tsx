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
import Loader from "@gradual/ui/loader";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { RiArrowDownSFill } from "@remixicon/react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "react-use";
import z from "zod/v4";
import { useTRPC } from "@/lib/trpc";

interface CreateOrgStepProps {
  onComplete: (
    organizationId: string,
    projectId: string,
    organizationSlug: string
  ) => void;
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
  const [currentEmailInput, setCurrentEmailInput] = useState("");
  const [slugAvailabilityStatus, setSlugAvailabilityStatus] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");

  const createOrg = useMutation(trpc.organization.create.mutationOptions());
  const createProject = useMutation(trpc.project.create.mutationOptions());

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
      onChange: createOrgSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setIsSubmitting(true);

      try {
        if (slugAvailabilityStatus === "unavailable") {
          setError("This organization slug is already taken");
          setIsSubmitting(false);
          return;
        }

        const organization = await createOrg.mutateAsync({
          name: value.orgName,
          slug: value.orgSlug,
        });

        const project = await createProject.mutateAsync({
          name: value.projectName,
          slug: value.projectSlug,
          organizationId: organization.id,
        });

        await queryClient.invalidateQueries(
          trpc.organization.getAllByUserId.pathFilter()
        );

        onComplete(organization.id, project.id, organization.slug);
      } catch (err) {
        toastManager.add({
          type: "error",
          title: "Failed to complete step, please try again.",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const orgName = useStore(form.store, (state) => state.values.orgName);
  const orgSlug = useStore(form.store, (state) => state.values.orgSlug);
  const projectName = useStore(form.store, (state) => state.values.projectName);
  const projectSlug = useStore(form.store, (state) => state.values.projectSlug);

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isProjectSlugManuallyEdited, setIsProjectSlugManuallyEdited] =
    useState(false);

  useEffect(() => {
    if (!orgName) {
      return;
    }

    const currentSlug = form.baseStore.state.values.orgSlug;
    const slugIsEmpty = !currentSlug;
    const slugNotManuallyEdited = !isSlugManuallyEdited;
    const shouldAutoFill = slugIsEmpty || slugNotManuallyEdited;

    if (shouldAutoFill) {
      const autoSlug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (autoSlug) {
        form.setFieldValue("orgSlug", autoSlug);
        if (slugIsEmpty) {
          setIsSlugManuallyEdited(false);
        }
      }
    }
  }, [orgName, isSlugManuallyEdited, form]);

  useEffect(() => {
    if (!projectName) {
      return;
    }

    const currentSlug = form.baseStore.state.values.projectSlug;
    const slugIsEmpty = !currentSlug;
    const slugNotManuallyEdited = !isProjectSlugManuallyEdited;
    const shouldAutoFill = slugIsEmpty || slugNotManuallyEdited;

    if (shouldAutoFill) {
      const autoSlug = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (autoSlug) {
        form.setFieldValue("projectSlug", autoSlug);
        if (slugIsEmpty) {
          setIsProjectSlugManuallyEdited(false);
        }
      }
    }
  }, [projectName, isProjectSlugManuallyEdited, form]);

  const [debouncedSlug, setDebouncedSlug] = useState(orgSlug);

  useDebounce(
    () => {
      setDebouncedSlug(orgSlug);
    },
    500,
    [orgSlug]
  );

  useEffect(() => {
    const checkSlug = async () => {
      if (
        !debouncedSlug ||
        debouncedSlug.length < 3 ||
        !slugRegex.test(debouncedSlug)
      ) {
        setSlugAvailabilityStatus("idle");
        return;
      }

      setSlugAvailabilityStatus("checking");
      try {
        const isAvailable = await queryClient.fetchQuery(
          trpc.organization.checkSlugAvailability.queryOptions({
            slug: debouncedSlug,
          })
        );
        setSlugAvailabilityStatus(isAvailable ? "available" : "unavailable");
      } catch {
        setSlugAvailabilityStatus("idle");
      }
    };

    checkSlug();
  }, [debouncedSlug, queryClient, trpc]);

  useEffect(() => {
    if (slugAvailabilityStatus === "unavailable") {
      form.setFieldMeta("orgSlug", (prev) => ({
        ...prev,
        errors: ["This organization slug is already taken"],
      }));
    } else if (slugAvailabilityStatus === "available") {
      form.setFieldMeta("orgSlug", (prev) => ({
        ...prev,
        errors: [],
      }));
    }
  }, [slugAvailabilityStatus, form]);

  const isFormValid =
    !!(
      orgName &&
      orgSlug &&
      projectName &&
      projectSlug &&
      slugRegex.test(orgSlug) &&
      slugRegex.test(projectSlug)
    ) &&
    slugAvailabilityStatus !== "unavailable" &&
    slugAvailabilityStatus !== "checking";

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
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setIsSlugManuallyEdited(true);
                  }}
                  placeholder="acme-inc"
                  value={field.state.value}
                />
                {slugAvailabilityStatus === "checking" && (
                  <Loader className="absolute -right-6 mt-2 animate-spin" />
                )}
                {slugAvailabilityStatus === "available" && (
                  <FieldDescription className="absolute mt-9">
                    <span className="text-green-600">✓ Available</span>
                  </FieldDescription>
                )}
                {slugAvailabilityStatus === "unavailable" && (
                  <FieldDescription className="absolute mt-9">
                    <span className="text-destructive">✗ Already taken</span>
                  </FieldDescription>
                )}
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
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setIsProjectSlugManuallyEdited(true);
                  }}
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
        <Field className="-space-y-1">
          <FieldLabel>
            Invite team members{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </FieldLabel>
          <FieldDescription>
            Press Enter to add a teammate to the list (max 3 for onboarding)
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

              if (teamMembers.length >= 3) {
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
                  disabled={teamMembers.length >= 3}
                  onChange={(e) => setCurrentEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    teamMembers.length >= 3
                      ? "Maximum 3 team members reached"
                      : "teammate@example.com"
                  }
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
                                  className="flex min-w-32 items-center justify-start gap-1 pr-1.5 pl-2 text-left text-xs"
                                  size="base"
                                  variant="outline"
                                >
                                  {member.role.charAt(0).toUpperCase() +
                                    member.role.slice(1)}
                                  <RiArrowDownSFill className="ml-auto size-4 shrink-0" />
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
          disabled={
            !form.state.canSubmit ||
            isSubmitting ||
            isLoading ||
            !isFormValid ||
            slugAvailabilityStatus !== "available"
          }
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
