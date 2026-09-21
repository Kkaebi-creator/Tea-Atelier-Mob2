import React from "react";

type TeaLoaderProps = {
  label?: string;
  size?: "inline" | "page";
};

const TeaLoader: React.FC<TeaLoaderProps> = ({ label, size = "inline" }) => (
  <span className={`tea-loader tea-loader-${size}`} role="status" aria-label={label || "Loading"}>
    <span className="tea-loader-orbit" aria-hidden="true">
      <span className="tea-loader-leaf tea-loader-leaf-one" />
      <span className="tea-loader-leaf tea-loader-leaf-two" />
    </span>
    {label && <span className="tea-loader-label">{label}</span>}
  </span>
);

export default TeaLoader;
