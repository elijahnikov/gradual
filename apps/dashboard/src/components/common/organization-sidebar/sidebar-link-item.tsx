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

  const innerContent = (
    <Tooltip>
      <TooltipTrigger>
        <Button
          className={cn(
            "group/menu flex h-8 items-center justify-start self-start rounded-full text-left font-sans text-[13px]",
            isActive
              ? "text-ui-fg-base"
              : "text-ui-fg-muted transition-colors duration-200 hover:bg-[rgba(0,0,0,0.070)] hover:text-ui-fg-base dark:hover:bg-[rgba(255,255,255,0.070)]"
          )}
          key={title}
          size="small"
          variant={isActive ? "secondary" : "ghost"}
        >
          <Icon className={cn("size-4")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );

  if (external) {
    return (
      <a href={url} rel="noopener noreferrer" target="_blank">
        {innerContent}
      </a>
    );
  }

  return (
    <Link
      params={{
        organizationSlug: organizationParams?.organizationSlug,
        projectSlug: organizationParams?.projectSlug,
      }}
      preload="intent"
      preloadDelay={100}
      to={url}
    >
      {innerContent}
    </Link>
  );
}

export default memo(SidebarLinkItem);
