import clsx from "clsx";
import { useState } from "react";

interface IToolTip {
  content: string;
  children: React.ReactNode;
}

const ToolTip = ({ content, children }: IToolTip) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={clsx("relative inline-block")}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute py-1 px-3 mt-1 bg-[#1A1B22] text-secondGray text-sm rounded-lg z-1000 whitespace-nowrap pointer-events-none`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default ToolTip;
