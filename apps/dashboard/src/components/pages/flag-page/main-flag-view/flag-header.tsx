import type { RouterOutputs } from "@gradual/api";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Card } from "@gradual/ui/card";
import CopyButton from "@gradual/ui/copy-button";
import { Heading } from "@gradual/ui/heading";
import { Text } from "@gradual/ui/text";
import {
  RiCalendarFill,
  RiKey2Fill,
  RiTimeFill,
  RiUserFill,
} from "@remixicon/react";
import dayjs from "dayjs";

interface FlagHeaderProps {
  flag: Pick<RouterOutputs["featureFlags"]["getByKey"], "flag" | "maintainer">;
}

export default function FlagHeader({
  flag: { flag, maintainer },
}: FlagHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b px-6 py-5">
      <div className="flex flex-col gap-y-1">
        <Heading className="text-3xl" level="h1">
          {flag.name}
        </Heading>
        {flag.description && (
          <Text className="text-ui-fg-muted" size="small">
            {flag.description}
          </Text>
        )}
        <div className="mt-2 flex items-center gap-x-6">
          {/* Key */}
          <div className="flex items-center gap-1">
            <RiKey2Fill className="size-4 text-ui-fg-muted" />
            <Text className="font-mono text-ui-fg-muted text-xs">
              {flag.key}
            </Text>
            <CopyButton className="size-5 [&_svg]:size-3" text={flag.key} />
          </div>
          {/* Created on */}
          <div className="flex items-center gap-x-1">
            <RiCalendarFill className="size-4 text-ui-fg-muted" />
            <Text className="font-medium text-ui-fg-base" size="xsmall">
              {dayjs(flag.createdAt).format("MMM DD, YYYY")}
            </Text>
          </div>
          {/* Last updated */}
          <div className="flex items-center gap-x-1">
            <RiTimeFill className="size-4 text-ui-fg-muted" />
            <Text className="font-medium text-ui-fg-base" size="xsmall">
              {dayjs(flag.updatedAt).format("MMM DD, YYYY")}
            </Text>
          </div>
          <div className="flex items-center gap-x-1">
            <RiUserFill className="size-4 text-ui-fg-muted" />
            <div className="flex items-center gap-x-1">
              <Card className="flex size-5 items-center justify-center rounded-full p-0">
                <Avatar className="flex size-5 shrink-0 items-center justify-center">
                  <AvatarImage src={maintainer?.image ?? undefined} />
                  <AvatarFallback>{maintainer?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Card>
              <Text className="font-medium text-ui-fg-base" size="xsmall">
                {maintainer?.email}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
