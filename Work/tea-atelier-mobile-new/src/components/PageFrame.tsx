import React from "react";
import { IonPage } from "@ionic/react";

// The route can own a stable IonPage while guest/authenticated content changes.
export default function PageFrame({
  embedded = false,
  className,
  children,
}: React.PropsWithChildren<{ embedded?: boolean; className?: string }>) {
  return embedded ? (
    <>{children}</>
  ) : (
    <IonPage className={className}>{children}</IonPage>
  );
}
