import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { authEnv } from "../../env";
export const resend = new Resend(authEnv().AUTH_RESEND_KEY as string);

export const emailOTPPlugin = emailOTP({
  async sendVerificationOTP({ email, otp, type }) {
    if (type === "sign-in") {
      const { error } = await resend.emails.send({
        from: "Gradual <noreply@notifications.gradual.so>",
        to: [email],
        template: {
          id: "email-otp",
          variables: {
            otp,
          },
        },
      });
      if (error) {
        console.error("Error sending email", error);
      }
    } else if (type === "email-verification") {
      console.log("email-verification", email, otp);
    }
  },
});
