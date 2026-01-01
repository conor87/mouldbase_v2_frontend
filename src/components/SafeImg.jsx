import React from "react";

export default function SafeImg({ src, alt = "", className = "", style = {}, fallback = "/media/default.jpeg", ...rest }) {
  const handleError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallback;
  };

  return <img src={src} alt={alt} className={className} style={style} onError={handleError} {...rest} />;
}