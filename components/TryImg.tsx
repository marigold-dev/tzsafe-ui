import { useState } from "react";

export function TryImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [show, setShow] = useState(true);

  return show ? (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setShow(false)}
    />
  ) : null;
}
