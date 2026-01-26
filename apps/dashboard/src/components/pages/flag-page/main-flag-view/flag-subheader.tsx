import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Tabs, TabsList, TabsTab } from "@gradual/ui/tabs";

export default function FlagSubheader() {
  return (
    <div className="sticky top-0 flex min-h-12 items-center justify-between border-b bg-ui-bg-base px-5 py-3">
      <Tabs defaultValue="targeting">
        <TabsList className="shadow-elevation-card-rest">
          <TabsTab value="targeting">Targeting</TabsTab>
          <TabsTab value="variations">Variations</TabsTab>
          <TabsTab value="metrics">Metrics</TabsTab>
          <TabsTab value="events">Events</TabsTab>
          <TabsTab value="settings">Settings</TabsTab>
        </TabsList>
      </Tabs>
      <Select>
        <SelectTrigger className="h-9 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value="targeting">Targeting</SelectItem>
          <SelectItem value="variations">Variations</SelectItem>
          <SelectItem value="metrics">Metrics</SelectItem>
          <SelectItem value="events">Events</SelectItem>
          <SelectItem value="settings">Settings</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
