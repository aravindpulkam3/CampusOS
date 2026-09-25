import { useState } from "react";

// A stored image URL can still be dead (e.g. old placeholder links); callers
// fall back to their no-image rendering when it fails to load.
// Returns [shouldShow, onError].
const useImageOk = (src) => {
  const [failedSrc, setFailedSrc] = useState(null);
  return [!!src && failedSrc !== src, () => setFailedSrc(src)];
};

export default useImageOk;
