import React from "react";
export default function PageIntro({
  title,
  description,
  eyebrow = "Tea Atelier",
}: {
  title: string;
  description?: string;
  eyebrow?: string;
}) {
  return (
    <div className="tea-page-intro">
      <p className="tea-info-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p className="tea-page-description">{description}</p>}
    </div>
  );
}
