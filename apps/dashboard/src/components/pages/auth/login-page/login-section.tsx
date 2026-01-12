import { parseAsString, useQueryState } from "nuqs";
import LoginForm from "./login-form";
import VerifyOTPForm from "./verify-otp-form";

export default function LoginPageSection() {
  const [email, setEmail] = useQueryState(
    "email",
    parseAsString.withDefault("")
  );

  return (
    <div className="flex h-full w-full items-center justify-center px-4 sm:px-0">
      {email ? (
        <VerifyOTPForm email={email} goBack={() => setEmail(null)} />
      ) : (
        <LoginForm onSubmit={(email) => setEmail(email)} />
      )}
    </div>
  );
}
