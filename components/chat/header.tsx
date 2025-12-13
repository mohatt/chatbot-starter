"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar/toggler";
import { Button } from "@/components/ui/button";
import { VercelIcon } from "../icons";
import { PlusIcon } from "lucide-react";
import { useSidebar } from "../ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "../visibility-selector";

export interface HeaderProps {
  isReadonly: boolean;
  visibilityType: VisibilityType;
  setVisibilityType: (type: VisibilityType) => void;
}

export function ChatHeader(props: HeaderProps) {
  const { isReadonly, visibilityType, setVisibilityType } = props;
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Button
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
          size='icon'
        >
          <PlusIcon />
          <span className="md:sr-only">New Chat</span>
        </Button>
      )}

      {!isReadonly && (
        <VisibilitySelector
          className="order-1 md:order-2"
          visibilityType={visibilityType}
          setVisibilityType={setVisibilityType}
        />
      )}

      <Button
        asChild
        className="order-3 hidden bg-zinc-900 px-2 text-zinc-50 hover:bg-zinc-800 md:ml-auto md:flex dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <Link
          href={"https://vercel.com/templates/next.js/nextjs-ai-chatbot"}
          rel="noreferrer"
          target="_noblank"
        >
          <VercelIcon size={16} />
          Deploy with Vercel
        </Link>
      </Button>
    </header>
  );
}
