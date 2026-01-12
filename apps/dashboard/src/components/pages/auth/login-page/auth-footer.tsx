export default function Footer() {
  return (
    <p className="txt-compact-xsmall absolute bottom-4 mt-auto text-center text-ui-fg-muted leading-4 lg:max-w-[25%]">
      By clicking continue, you acknowledge that you have read and agree to
      Evermind's{" "}
      <a href="/terms-of-service" rel="noopener noreferrer" target="_blank">
        <span className="cursor-pointer underline hover:text-black dark:hover:text-white">
          Terms of Service
        </span>
      </a>{" "}
      and{" "}
      <a href="/privacy-policy" rel="noopener noreferrer" target="_blank">
        <span className="cursor-pointer underline hover:text-black dark:hover:text-white">
          Privacy Policy
        </span>
      </a>
      .
    </p>
  );
}
