import { Portal } from "react-portal";
import clsx from "clsx";
import { useRef, useState } from "react";

export interface IModalWindow {
  children?: React.ReactNode;
  onClose: () => void;
  className?: string;
}

export default function ModalWindow({
  onClose,
  children,
  className,
}: IModalWindow) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [shouldClose, setShouldClose] = useState(false);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      setShouldClose(true);
    } else {
      setShouldClose(false);
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldClose && e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <Portal node={document && document.getElementsByTagName("body")[0]}>
      <div
        ref={overlayRef}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        className={clsx(
          "fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/40 z-[999] p-5 flex-middle"
        )}
      >
        <div
          className={clsx(
            "custom-scrollbar p-5 rounded-[18px] bg-[#111217] fixed overflow-auto mx-auto max-h-[90vh]",
            className
          )}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
