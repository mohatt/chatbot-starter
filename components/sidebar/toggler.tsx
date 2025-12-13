import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { PanelLeftIcon } from 'lucide-react'

export function SidebarToggle({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={className}
          data-sidebar="trigger"
          data-slot="sidebar-trigger"
          onClick={toggleSidebar}
          variant="outline"
          size='icon'
        >
          <PanelLeftIcon />
          <span className="md:sr-only">Toggle Sidebar</span>
        </Button>
      </TooltipTrigger>

      <TooltipContent align="start" className="hidden md:block">
        Toggle Sidebar
      </TooltipContent>
    </Tooltip>
  );
}
