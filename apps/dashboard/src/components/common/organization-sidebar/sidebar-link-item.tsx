import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gradual/ui/tooltip";
import { Link, useParams } from "@tanstack/react-router";
import { memo } from "react";

interface SidebarLinkItemProps {
  url: string;
  title: string;
  icon: React.ElementType;
  isActive?: boolean;
  external?: boolean;
}

function SidebarLinkItem({
  url,
  title,
  icon,
  isActive,
  external,
}: SidebarLinkItemProps) {
  const Icon = icon as React.ComponentType<{ className?: string }>;

  const organizationParams = useParams({ strict: false });

  const buttonClassName = cn(
    "group/menu flex h-8 items-center justify-start self-start rounded-full text-left font-sans text-[13px] focus-visible:bg-transparent! focus-visible:shadow-borders-interactive-with-active!",
    isActive
      ? "text-ui-fg-base"
      : "text-ui-fg-muted transition-colors duration-200 hover:bg-[rgba(0,0,0,0.070)] hover:text-ui-fg-base dark:hover:bg-[rgba(255,255,255,0.070)]"
  );

  const buttonVariant = isActive ? "secondary" : "ghost";

  if (external) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              className={buttonClassName}
              render={
                // biome-ignore lint/a11y/useAnchorContent: content provided by TooltipTrigger children
                <a href={url} rel="noopener noreferrer" target="_blank" />
              }
              size="small"
              variant={buttonVariant}
            />
          }
        >
          <Icon className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">{title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className={buttonClassName}
            render={
              <Link
                params={{
                  organizationSlug: organizationParams?.organizationSlug,
                  projectSlug: organizationParams?.projectSlug,
                }}
                preload="intent"
                preloadDelay={100}
                search={{}}
                to={url}
              />
            }
            size="small"
            variant={buttonVariant}
          />
        }
      >
        <Icon className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}

export default memo(SidebarLinkItem);
