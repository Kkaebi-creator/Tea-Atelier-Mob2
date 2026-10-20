import React, { useState } from "react";
import { mediaUrl } from "../config/media";
import "../theme/profile-checkout.css";

const ProfileAvatar: React.FC<{
  name: string;
  src?: string | null;
  className?: string;
}> = ({ name, src, className = "" }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = mediaUrl(src);
  const initials = (name.trim() || "Tea Atelier")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();

  return (
    <span className={`tea-profile-avatar ${className}`}>
      {url && url !== failedUrl ? (
        <img
          src={url}
          alt={`${name}'s profile photo`}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <span role="img" aria-label={`${name}'s profile initials`}>
          {initials}
        </span>
      )}
    </span>
  );
};

export default ProfileAvatar;
