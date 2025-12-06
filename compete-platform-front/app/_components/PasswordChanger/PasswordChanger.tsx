import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface IPasswordChanger {
  password: string | null;
  onUpdate: (value: string | null) => void;
}

const PasswordChanger = ({ password, onUpdate }: IPasswordChanger) => {
  const inputRef = useRef(null);
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [customPassword, setCustomPassword] = useState(password);
  var hiddenPassword = "";

  const changeHiddenPassword = () => {
    if (password === null) return "";
    for (let i = 0; i < (password.length < 8 ? password.length : 8); i++) {
      hiddenPassword += "*";
    }
    return hiddenPassword;
  };

  const onPasswordOk = () => {
    if (customPassword !== null && customPassword.length > 16) {
      toast.error("Пароль не может быть длиннее 16 символов");
      return;
    }
    if (customPassword === "") setCustomPassword(null);
    onUpdate(customPassword);
    setIsInputVisible((pr) => !pr);
  };

  const onChange = () => {
    setIsInputVisible((pr) => !pr);
    setCustomPassword(null);
  };

  useEffect(() => {
    if (isInputVisible) {
      inputRef.current?.focus();
    }
  }, [isInputVisible]);

  return (
    <div className="flex items-center w-full gap-[16px]">
      <span className="font-inter">Пароль:</span>
      {!isInputVisible ? (
        <>
          <p className="ml-auto font-semibold text-base">
            {changeHiddenPassword()}
          </p>
        </>
      ) : (
        <input
          ref={inputRef}
          onChange={(e) => setCustomPassword(e.target.value)}
          placeholder="Пароль"
          className="border-b-[1px] max-w-[150px] ml-auto border-b-gray-new flex items-center placeholder:text-white/20"
          type="text"
          value={customPassword}
          min={1}
          onKeyDown={(e) => {
            if (e.key === "Enter") onPasswordOk();
          }}
        />
      )}
      <button
        className={clsx(
          "font-medium text-[#545454] hover:text-white",
          !isInputVisible && "hidden"
        )}
        onClick={onPasswordOk}
      >
        ок
      </button>
      <button
        className={clsx(
          "font-medium text-[#545454] hover:text-white",
          isInputVisible && "hidden"
        )}
        onClick={onChange}
      >
        изм.
      </button>
    </div>
  );
};

export default PasswordChanger;
