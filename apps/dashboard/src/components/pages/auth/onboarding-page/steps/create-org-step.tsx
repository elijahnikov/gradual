"use client";

import { Button } from "@gradual/ui/button";
import { Field } from "@gradual/ui/field";
import { Input } from "@gradual/ui/input";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import z from "zod/v4";
import { useTRPC } from "@/lib/trpc";

interface CreateOrgStepProps {
  onComplete: () => void;
}

const createOrgSchema = z.object({
  orgName: z.string().min(1, "Organization name is required"),
  orgSlug: z
    .string()
    .min(1, "Organization slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
  projectName: z.string().min(1, "Project name is required"),
  projectSlug: z
    .string()
    .min(1, "Project slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
  teamEmails: z.string(),
});

export function CreateOrgStep({ onComplete }: CreateOrgStepProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const _createOrg = useMutation(trpc.organization.create.mutationOptions());
  const _createProject = useMutation(trpc.project.create.mutationOptions());

  const form = useForm({
    defaultValues: {
      orgName: "",
      orgSlug: "",
      projectName: "",
      projectSlug: "",
      teamEmails: "",
    },
    validators: {
      onSubmit: createOrgSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setIsLoading(true);

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
        // Parse teamEmails and send invites
        const emails = value.teamEmails
          ? value.teamEmails
              .split(",")
              .map((email) => email.trim())
              .filter(Boolean)
          : [];

        // You'll need to implement an invite mutation
        // For now, we'll just log it
        if (emails.length > 0) {
          console.log("Team emails to invite:", emails);
        }

        onComplete();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create workspace"
        );
      } finally {
        setIsLoading(false);
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
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="space-y-4">
        <h3 className="font-semibold text-base">Organization</h3>

        <form.Field
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Acme Inc."
                  required
                  value={field.state.value}
                />
              </Field>
            );
          }}
          name="orgName"
        />

        <form.Field
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="acme-inc"
                  required
                  value={field.state.value}
                />

                <p className="mt-1 text-muted-foreground text-xs">
                  This will be used in your organization URL
                </p>
              </Field>
            );
          }}
          name="orgSlug"
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base">First Project</h3>

        <form.Field
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="My First Project"
                  required
                  value={field.state.value}
                />
              </Field>
            );
          }}
          name="projectName"
        />

        <form.Field
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="my-first-project"
                  required
                  value={field.state.value}
                />
              </Field>
            );
          }}
          name="projectSlug"
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base">
          Invite Team Members (optional)
        </h3>

        <form.Field
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="colleague@example.com, teammate@example.com"
                  value={field.state.value}
                />

                <p className="mt-1 text-muted-foreground text-xs">
                  Separate multiple emails with commas
                </p>
              </Field>
            );
          }}
          name="teamEmails"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button disabled={isLoading} type="submit">
          {isLoading ? "Creating..." : "Create Workspace"}
        </Button>
      </div>
    </form>
  );
}
