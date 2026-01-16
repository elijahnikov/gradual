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
import { RiUserFill } from "@remixicon/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import z from "zod/v4";
import { useFileUpload } from "@/lib/hooks/use-file-upload";
import { useTRPC } from "@/lib/trpc";

const roles = [
  "Software Engineer",
  "Product Manager",
  "Designer",
  "Engineering Manager",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Engineer",
  "QA Engineer",
  "Technical Lead",
  "Architect",
  "UX Designer",
  "UI Designer",
  "Marketing",
  "Sales",
  "Customer Success",
  "Other",
];

interface GettingStartedStepProps {
  onComplete: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

const gettingStartedSchema = z.object({
  username: z.string().min(1, "Display name is required"),
  avatarUrl: z.url(),
  jobRole: z.union([z.string(), z.undefined()]),
});

export function GettingStartedStep({
  onComplete,
  onSkip,
  isLoading = false,
}: GettingStartedStepProps) {
  const trpc = useTRPC();
  const { data: session } = useSuspenseQuery(
    trpc.auth.getSession.queryOptions()
  );
  const { mutate: updateUser } = useMutation(
    trpc.auth.updateUser.mutationOptions({
      onSuccess: () => {
        onComplete();
      },
    })
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [
    { files, isDragging },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    multiple: false,
    maxFiles: 1,
    maxSize: 1024 * 1024 * 5,
    accept: "image/*",
  });

  const form = useForm({
    defaultValues: {
      username: session?.user?.name || "",
      avatarUrl: session?.user?.image || "",
      jobRole: undefined as string | undefined,
    },
    validators: {
      onSubmit: gettingStartedSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        let avatarUrl = value.avatarUrl;

        if (files.length > 0 && files[0]?.file instanceof File) {
          const file = files[0].file as File;
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to upload file");
          }

          const { url } = await response.json();
          avatarUrl = url;
        }

        updateUser({
          name: value.username,
          image: avatarUrl,
        });
        onComplete();
      } catch (error) {
        console.error("Error updating user:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <form
      className="h-full w-full space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Card
        className="flex min-h-36 flex-col items-center justify-center rounded-xl bg-white px-1 py-2 transition-colors has-disabled:pointer-events-none has-[input:focus]:border-ring has-disabled:opacity-50 has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:border-interactive dark:bg-ui-bg-field"
        data-dragging={isDragging || undefined}
        onClick={openFileDialog}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          {...getInputProps()}
          aria-label="Upload files"
          className="sr-only"
        />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div>
            {files.length > 0 || form.baseStore.state.values.avatarUrl ? (
              <div className="flex w-full flex-col items-center justify-center gap-2">
                <img
                  alt={
                    files[0]?.file instanceof File
                      ? files[0].file.name
                      : "Avatar"
                  }
                  className="h-24 w-full min-w-24 max-w-24 rounded-full object-cover"
                  height={96}
                  src={
                    files.length > 0 && files[0]?.preview
                      ? files[0].preview
                      : form.baseStore.state.values.avatarUrl ||
                        String(session?.user?.image || "")
                  }
                  width={96}
                />
              </div>
            ) : (
              <div className="flex max-h-24 min-h-24 min-w-24 max-w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ui-bg-base shadow-borders-base">
                <RiUserFill className="size-6 text-secondary-foreground/70" />
              </div>
            )}
          </div>
          <Text className="text-ui-fg-muted" size={"xsmall"} weight={"plus"}>
            Drag & drop or click to browse
          </Text>
        </div>
      </Card>

      <form.Field
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Display name</FieldLabel>
              <Input
                aria-invalid={isInvalid}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter your desired display name"
                value={field.state.value}
              />
              <FieldDescription>
                This is how you'll be identified across your organization(s)
              </FieldDescription>
              {isInvalid && (
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
        name="username"
      />

      <form.Field
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Role</FieldLabel>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="flex w-full items-start justify-start text-start"
                      variant="outline"
                    />
                  }
                >
                  {field.state.value || "Select a role"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  {roles.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => field.handleChange(role)}
                    >
                      {role}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <FieldDescription>
                This helps us personalize your experience
              </FieldDescription>
              {isInvalid && (
                <FieldError>
                  {field.state.meta.errors.map((error, i) => (
                    <Text className="text-ui-fg-error" key={i}>
                      {typeof error === "string" ? error : String(error)}
                    </Text>
                  ))}
                </FieldError>
              )}
            </Field>
          );
        }}
        name="jobRole"
      />

      <div className="absolute bottom-16 left-0 mt-auto flex w-1/2 translate-x-1/2 items-center justify-center gap-2 pt-4">
        <div className="flex w-[400px] gap-2">
          <Button onClick={onSkip} type="button" variant="outline">
            Skip
          </Button>
          <LoadingButton
            className="w-full text-[13px]"
            loading={isSubmitting || isLoading}
            type="submit"
            variant="gradual"
          >
            Continue
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}
