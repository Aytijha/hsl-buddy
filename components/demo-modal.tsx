"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDemoModal } from "@/hooks/use-demo-modal";

export const DemoModal = () => {
  const demoModal = useDemoModal();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Dialog open={demoModal.isOpen} onOpenChange={demoModal.onClose}>
      <DialogContent>
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-center">
            Disabled
          </DialogTitle>
          <DialogDescription className="text-center space-y-2">
            Hi, I had to disable creation of new companions to avoid spam.
            <br />
            To test companion creation, clone the repository from master branch :)
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="flex justify-center">
          <Button onClick={demoModal.onClose}>
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
