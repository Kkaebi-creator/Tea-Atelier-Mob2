import React from "react";
import { IonButton, IonIcon } from "@ionic/react";
import { syncOutline } from "ionicons/icons";

type Props = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
};

export default function RefreshButton({
  label,
  onClick,
  disabled,
  busy = false,
}: Props) {
  return (
    <IonButton
      type="button"
      fill="clear"
      className="tea-action-button tea-refresh-button"
      aria-label={label}
      aria-busy={busy}
      disabled={disabled || busy}
      onClick={onClick}
    >
      <IonIcon
        icon={syncOutline}
        slot="start"
        aria-hidden="true"
        className={busy ? "tea-refresh-spinning" : undefined}
      />
      {busy ? "Refreshing…" : "Refresh"}
    </IonButton>
  );
}
