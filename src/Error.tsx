import React from "react";

export function Error({message}: {message: string}) {
  return (
    <div className="flex justify-center items-center" role="alert">
      Oops... {message}
    </div>
  );
}
