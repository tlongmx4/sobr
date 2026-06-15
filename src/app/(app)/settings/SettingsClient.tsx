"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  user: {
    name: string;
    preferredName: string | null;
    username: string;
    email: string;
    showMilestones: boolean;
  };
};

export function SettingsClient({ user }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showMilestones, setShowMilestones] = useState(user.showMilestones);

  const milestonesMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showMilestones: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Couldn't update milestones",
        );
      }
      return res.json();
    },
    onError: (_err, next) => {
      // Roll the toggle back if the save failed.
      setShowMilestones(!next);
    },
  });

  function handleMilestonesChange(next: boolean) {
    setShowMilestones(next);
    milestonesMutation.mutate(next);
  }

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string" ? data.error : "Couldn't delete account",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });

  const canConfirm = confirmText.trim().toLowerCase() === "delete";

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            How you appear inside sobrandsteady.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name" value={user.name} />
          <Field
            label="Preferred name"
            value={user.preferredName ?? "—"}
          />
          <Field label="Username" value={user.username} />
          <Field label="Email" value={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>
            Show milestone coins on your dashboard as you reach them. This is
            just for you, and turning it off only hides them. Nothing you have
            earned is ever deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show-milestones" className="font-normal">
              Show milestone coins
            </Label>
            <Switch
              id="show-milestones"
              checked={showMilestones}
              onCheckedChange={handleMilestonesChange}
              disabled={milestonesMutation.isPending}
            />
          </div>
          {milestonesMutation.isError && (
            <p className="mt-2 text-sm text-destructive">
              {milestonesMutation.error instanceof Error
                ? milestonesMutation.error.message
                : "Something went wrong"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30 ring-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently deletes your account, all check-ins, and your
            entire chat history. This can&apos;t be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) {
            setConfirmText("");
            deleteMutation.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently remove your profile, all of your
              check-ins, and your full chat history. There&apos;s no undo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono text-foreground">delete</span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
              autoComplete="off"
              disabled={deleteMutation.isPending}
            />
          </div>

          {deleteMutation.isError && (
            <p className="text-sm text-destructive">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "Something went wrong"}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canConfirm || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{value}</span>
    </div>
  );
}
