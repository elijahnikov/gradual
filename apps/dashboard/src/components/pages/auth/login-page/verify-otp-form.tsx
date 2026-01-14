import { Button } from "@gradual/ui/button";
import { Heading } from "@gradual/ui/heading";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@gradual/ui/input-otp";
import { LoadingButton } from "@gradual/ui/loading-button";
// import { Logo } from "@gradual/ui/logo";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
import z from "zod/v4";
import { authClient } from "@/auth/client";
import { useTRPC } from "@/lib/trpc";
import Footer from "./auth-footer";

const submitCodeSchema = z.object({
  code: z.string().length(6),
});

export default function VerifyOTPForm({
  email,
  goBack,
}: {
  email: string;
  goBack: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      code: "",
    },
    validators: {
      onSubmit: submitCodeSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      const res = await authClient.signIn.emailOtp({
        email,
        otp: value.code,
      });
      if (res.error) {
        toastManager.add({
          type: "error",
          title: "Invalid code. Please try again.",
        });
        form.resetField("code");
      }
      if (res.data) {
        await queryClient.invalidateQueries(trpc.auth.getSession.queryFilter());
        throw navigate({ to: "/" });
      }
      setIsSubmitting(false);
    },
  });

  return (
    <div className="flex h-[75%] w-full min-w-[280px] max-w-[90vw] bg-ui-bg-subtle sm:max-w-[380px] md:max-w-[400px] lg:w-[30vw] lg:min-w-[450px] lg:max-w-none">
      <div className="flex w-full flex-col items-center px-4 py-8 sm:px-8 md:px-12">
        <div className="flex flex-col items-center">
          <div className="mt-6 flex flex-col items-center gap-0">
            <Heading level="h1">Check your inbox!</Heading>
            <Text
              className="text-balance text-center font-medium text-ui-fg-subtle"
              size="small"
            >
              We've sent a verification code to your email. Please enter it
              below to continue.
            </Text>
          </div>
        </div>
        <div className="mt-8 flex w-full flex-col items-center gap-2">
          <form
            className="flex w-full flex-col items-center space-y-4"
            id="verify-otp-form"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field
              children={(field) => {
                return (
                  <InputOTP
                    autoFocus
                    className="w-full"
                    inputMode="numeric"
                    maxLength={6}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(value) => field.handleChange(value)}
                    onComplete={() => void form.handleSubmit()}
                    value={field.state.value}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                );
              }}
              name="code"
            />

            <LoadingButton
              className="w-full"
              loading={isSubmitting}
              type="submit"
              variant="gradual"
            >
              Continue
            </LoadingButton>
          </form>
          <div className="flex w-full items-center gap-2">
            <Separator className="mt-4 mb-2 w-full" />
          </div>
          <Button
            className="gap-x-1 text-ui-fg-muted"
            onClick={goBack}
            variant="ghost"
          >
            <ArrowLeftIcon className="size-3.5" />
            Go back
          </Button>
        </div>
        <Footer />
      </div>
    </div>
  );
}
