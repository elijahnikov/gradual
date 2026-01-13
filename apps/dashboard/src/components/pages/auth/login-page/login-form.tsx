"use client";

import { cn } from "@gradual/ui";
import { Card } from "@gradual/ui/card";
import { Field, FieldError } from "@gradual/ui/field";
import { Heading } from "@gradual/ui/heading";
import { Input } from "@gradual/ui/input";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import z from "zod/v4";
import { authClient } from "@/auth/client";
import Footer from "./auth-footer";
import LoginButtons from "./login-buttons";

const loginFormSchema = z.object({
  email: z.email(),
});

export default function LoginForm({
  onSubmit,
}: {
  onSubmit: (email: string) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: loginFormSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: value.email,
        type: "sign-in",
      });
      if (res.error) {
        toastManager.add({
          type: "error",
          title: "Uh oh! Something went wrong.",
          description:
            res.error.statusText ||
            "An unknown error occurred, please try again.",
        });
      }
      if (res.data) {
        onSubmit(value.email);
      }
      setIsSubmitting(false);
    },
  });

  return (
    <div className="flex h-[75%] w-full min-w-[280px] max-w-[90vw] bg-ui-bg-subtle sm:max-w-[380px] md:max-w-[400px] lg:w-[30vw] lg:min-w-[450px] lg:max-w-none">
      <div className="flex w-full flex-col items-center px-4 py-8 sm:px-8 md:px-12">
        <div className="flex flex-col items-center">
          <Card
            className={cn(
              "relative flex shrink-0 items-center justify-center overflow-hidden p-0"
            )}
          >
            <img
              alt="Gradual"
              height={64}
              src="/gradual-logo-500x500.png"
              width={64}
            />
          </Card>
          <div className="mt-6 flex flex-col items-center gap-0">
            <Heading level="h1">Continue to Gradual</Heading>
            <Text className="font-medium text-ui-fg-subtle" size="small">
              Welcome back! Please log in to continue.
            </Text>
          </div>
        </div>
        <div className="mt-8 flex w-full flex-col items-center gap-2">
          <form
            className="w-full space-y-4"
            id="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <Input
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter your email"
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
              name="email"
            />
            <LoadingButton
              className="w-full"
              loading={isSubmitting}
              type="submit"
              variant={"gradual"}
            >
              Continue with email
            </LoadingButton>
          </form>
          <div className="flex w-full items-center gap-2">
            <Separator className="my-4 w-full" />
          </div>
          <LoginButtons />
        </div>
        <Footer />
      </div>
    </div>
  );
}
