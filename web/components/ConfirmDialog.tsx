"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  trigger: (open: () => void) => React.ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  trigger,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const openDialog = () => setOpen(true);
  const closeDialog = () => {
    if (isPending) return;
    setOpen(false);
  };

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      {trigger(openDialog)}
      <Modal open={open} onClose={closeDialog} title={title} description={description} size="sm">
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={closeDialog} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} isLoading={isPending}>
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
