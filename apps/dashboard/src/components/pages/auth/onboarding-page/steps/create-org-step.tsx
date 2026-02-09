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
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { RiArrowDownSFill, RiBuilding2Fill } from "@remixicon/react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "react-use";
import z from "zod/v4";
import { useFileUpload } from "@/lib/hooks/use-file-upload";
import { useOnboardingPreviewStore } from "@/lib/stores/onboarding-preview-store";
import { useTRPC } from "@/lib/trpc";
import { formatFormErrors } from "../utils";

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
  teamMembers: z.array(teamMemberSchema),
});

export function CreateOrgStep({
  onComplete,
  isLoading = false,
}: CreateOrgStepProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const previewStore = useOnboardingPreviewStore;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEmailInput, setCurrentEmailInput] = useState("");
  const [slugAvailabilityStatus, setSlugAvailabilityStatus] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");

  const createOrg = useMutation(trpc.organization.create.mutationOptions());
  const createProject = useMutation(trpc.project.create.mutationOptions());

  const [
    { files: logoFiles, isDragging: isLogoDragging },
    {
      handleDragEnter: handleLogoDragEnter,
      handleDragLeave: handleLogoDragLeave,
      handleDragOver: handleLogoDragOver,
      handleDrop: handleLogoDrop,
      openFileDialog: openLogoDialog,
      getInputProps: getLogoInputProps,
    },
  ] = useFileUpload({
    multiple: false,
    maxFiles: 1,
    maxSize: 1024 * 1024 * 5,
    accept: "image/*",
    onFilesChange: (newFiles) => {
      if (newFiles.length > 0 && newFiles[0]?.preview) {
        previewStore.getState().setOrgLogoPreviewUrl(newFiles[0].preview);
      }
    },
  });

  const form = useForm({
    defaultValues: {
      orgName: "",
      orgSlug: "",
      teamMembers: [] as Array<{
        email: string;
        role: "admin" | "member" | "viewer";
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

        let logoUrl: string | undefined;
        if (logoFiles.length > 0 && logoFiles[0]?.file instanceof File) {
          const file = logoFiles[0].file as File;
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const uploadError = await response.json();
            throw new Error(uploadError.error || "Failed to upload logo");
          }

          const { url } = await response.json();
          logoUrl = url;
          previewStore.getState().setOrgLogoPreviewUrl(url);
        }

        const organization = await createOrg.mutateAsync({
          name: value.orgName,
          slug: value.orgSlug,
          logo: logoUrl,
        });

        const project = await createProject.mutateAsync({
          name: "Main",
          slug: "default",
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

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

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
        previewStore.getState().setOrgSlug(autoSlug);
        if (slugIsEmpty) {
          setIsSlugManuallyEdited(false);
        }
      }
    }
  }, [orgName, isSlugManuallyEdited, form, previewStore]);

  const [debouncedSlug, setDebouncedSlug] = useState(orgSlug);
  const orgSlugRef = useRef(orgSlug);
  orgSlugRef.current = orgSlug;

  useEffect(() => {
    if (orgSlug !== debouncedSlug) {
      setSlugAvailabilityStatus("idle");
    }
  }, [orgSlug, debouncedSlug]);

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
        await queryClient.fetchQuery(
          trpc.organization.checkSlugAvailability.queryOptions({
            slug: debouncedSlug,
          })
        );
        if (orgSlugRef.current === debouncedSlug) {
          setSlugAvailabilityStatus("available");
        }
      } catch {
        if (orgSlugRef.current === debouncedSlug) {
          setSlugAvailabilityStatus("unavailable");
        }
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
    !!(orgName && orgSlug && slugRegex.test(orgSlug)) &&
    slugAvailabilityStatus === "available";

  useEffect(() => {
    previewStore
      .getState()
      .setStepCanContinue(!(isSubmitting || isLoading) && isFormValid);
    previewStore.getState().setStepIsSubmitting(isSubmitting || isLoading);
  }, [isSubmitting, isLoading, isFormValid, previewStore]);

  return (
    <form
      className="mx-auto flex h-full w-full max-w-[480px] flex-col space-y-8"
      id="onboarding-step-1"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Card
        className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl bg-white px-1 py-3 transition-colors has-disabled:pointer-events-none has-[input:focus]:border-ring has-disabled:opacity-50 has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:border-interactive dark:bg-ui-bg-field"
        data-dragging={isLogoDragging || undefined}
        onClick={openLogoDialog}
        onDragEnter={handleLogoDragEnter}
        onDragLeave={handleLogoDragLeave}
        onDragOver={handleLogoDragOver}
        onDrop={handleLogoDrop}
      >
        <input
          {...getLogoInputProps()}
          aria-label="Upload organization logo"
          className="sr-only"
        />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {logoFiles.length > 0 && logoFiles[0]?.preview ? (
            <img
              alt="Organization logo"
              className="h-16 w-16 rounded-full object-cover shadow-elevation-card-rest"
              height={64}
              src={logoFiles[0].preview}
              width={64}
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ui-bg-base shadow-borders-base">
              <RiBuilding2Fill className="size-5 text-secondary-foreground/70" />
            </div>
          )}
          <Text className="text-ui-fg-muted" size="xsmall" weight="plus">
            Upload organization logo
          </Text>
        </div>
      </Card>

      <div className="flex w-full items-start gap-x-2">
        <form.Field
          children={(field) => {
            const hasErrors = field.state.meta.errors.length > 0;
            const shouldShowError =
              hasErrors &&
              (field.state.meta.isTouched || form.state.isSubmitted);
            return (
              <Field className="flex-1" data-invalid={shouldShowError}>
                <FieldLabel>Organization</FieldLabel>
                <Input
                  aria-invalid={shouldShowError}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    previewStore.getState().setOrgName(e.target.value);
                  }}
                  placeholder="Acme Inc."
                  value={field.state.value}
                />
                {shouldShowError && (
                  <FieldError>
                    {formatFormErrors(field.state.meta.errors)}
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
              <Field
                className="relative flex w-full flex-1"
                data-invalid={shouldShowError}
              >
                <FieldLabel>Slug</FieldLabel>
                <div className="relative w-full">
                  <div className="flex rounded-md">
                    <span className="relative -top-px -left-px -z-10 inline-flex h-8.5 items-center rounded-s-md border border-r-0 bg-ui-bg-base px-3 text-muted-foreground text-sm">
                      gradual.so/
                    </span>
                    <Input
                      aria-invalid={shouldShowError}
                      className="-ms-px w-full rounded-s-none"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setIsSlugManuallyEdited(true);
                        previewStore.getState().setOrgSlug(e.target.value);
                      }}
                      placeholder="acme-inc"
                      value={field.state.value}
                    />
                  </div>
                  {slugAvailabilityStatus === "checking" && (
                    <Loader className="absolute top-[16px] right-2 -translate-y-1/2 animate-spin" />
                  )}
                </div>
                <div className="absolute -bottom-5 left-0">
                  {slugAvailabilityStatus === "available" && (
                    <span className="text-green-600 text-xs">Available</span>
                  )}
                  {slugAvailabilityStatus === "unavailable" && (
                    <span className="text-destructive text-xs">
                      This slug is already taken
                    </span>
                  )}
                </div>
                {shouldShowError && (
                  <FieldError>
                    {formatFormErrors(field.state.meta.errors)}
                  </FieldError>
                )}
              </Field>
            );
          }}
          name="orgSlug"
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

              const updated = [
                ...teamMembers,
                { email, role: "member" as const },
              ];
              field.handleChange(updated);
              previewStore.getState().setTeamMembers(updated);
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
              const updated = teamMembers.filter((_, i) => i !== index);
              field.handleChange(updated);
              previewStore.getState().setTeamMembers(updated);
            };

            const handleRoleChange = (
              index: number,
              role: "admin" | "member" | "viewer"
            ) => {
              const updated = [...teamMembers];
              if (updated[index]) {
                updated[index] = {
                  email: updated[index].email,
                  role,
                };
                field.handleChange(updated);
                previewStore.getState().setTeamMembers(updated);
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
    </form>
  );
}
