import AnimatedSection from "./animated-section";
import LoginPageSection from "./login-section";

export default function LoginPageComponent() {
  return (
    <div className="grid h-screen w-screen grid-cols-1 md:divide-x lg:grid-cols-2">
      <AnimatedSection />
      <LoginPageSection />
    </div>
  );
}
