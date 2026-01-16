import type { BundledLanguage } from "shiki";
import { codeToHtml } from "shiki";

interface Props {
  children: string;
  lang: BundledLanguage;
}

export default async function CodeBlock(props: Props) {
  const out = await codeToHtml(props.children, {
    lang: props.lang,
    theme: "github-light",
  });

  // biome-ignore lint/security/noDangerouslySetInnerHtml: <>
  return <div dangerouslySetInnerHTML={{ __html: out }} />;
}
