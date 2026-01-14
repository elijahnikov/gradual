"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
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
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import z from "zod/v4";
import { authClient } from "@/auth/client";
import { useTRPC } from "@/lib/trpc";

const roles = ["Software Engineer", "Product Manager", "Designer", "Other"];

interface GettingStartedStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

const gettingStartedSchema = z.object({
  username: z.string().min(1, "Username is required"),
  avatarUrl: z.url(),
  jobRole: z.string(),
});

export function GettingStartedStep({
  onComplete,
  onSkip,
}: GettingStartedStepProps) {
  const trpc = useTRPC();
  const { data: session } = useSuspenseQuery(
    trpc.auth.getSession.queryOptions()
  );
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      username: session?.user?.name || "",
      avatarUrl: session?.user?.image || "",
      jobRole: "",
    },
    validators: {
      onSubmit: gettingStartedSchema,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      try {
        await authClient.updateUser({
          name: value.username,
          image: value.avatarUrl || undefined,
        } as Record<string, unknown>);
        onComplete();
      } catch (error) {
        console.error("Error updating user:", error);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const username = form.baseStore.state.values.username;
  const avatarUrl = form.baseStore.state.values.avatarUrl;

  return (
    <form
      className="relative h-full w-full space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Card className="flex flex-col items-center gap-4">
        <Avatar className="size-20">
          <AvatarImage alt={username || "User"} src={avatarUrl} />
          <AvatarFallback>
            {username
              ? username
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "U"}
          </AvatarFallback>
        </Avatar>
      </Card>

      <form.Field
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel>Username</FieldLabel>
              <Input
                aria-invalid={isInvalid}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter your username"
                required
                value={field.state.value}
              />

              {isInvalid && (
                <FieldError>
                  {field.state.meta.errors
                    .map((error) => error?.message)
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
                  {field.state.meta.errors
                    .map((error) => error?.message)
                    .join(", ")}
                </FieldError>
              )}
            </Field>
          );
        }}
        name="jobRole"
      />

      <div className="absolute bottom-0 mt-auto flex w-full gap-2 pt-4">
        <Button onClick={onSkip} type="button" variant="outline">
          Skip
        </Button>
        <LoadingButton
          className="w-full text-[13px]"
          loading={isLoading}
          type="submit"
          variant="gradual"
        >
          Continue
        </LoadingButton>
      </div>
    </form>
  );
}
