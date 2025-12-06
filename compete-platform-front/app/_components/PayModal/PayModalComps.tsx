import clsx from "clsx";
import { Dispatch, SetStateAction, useState } from "react";
import Icon from "../Icon";

interface PayModalCompsProps {
  placeholderKey: string;
  values: { [key: string]: any };
  handleChange: any;
  placeholderTexts: {
    [key: string]: string;
  };
  needPromo: boolean;
  setCardIdentifier: Dispatch<SetStateAction<string>>;
  cardIdentifier: string;
}

const PayModalComps = ({
  placeholderKey,
  values,
  handleChange,
  placeholderTexts,
  needPromo,
  setCardIdentifier,
  cardIdentifier,
}: PayModalCompsProps) => {
  const [payType, setPayType] = useState("ymoney");

  return (
    <>
      <span className="font-bold text-[24px] my-[4px]">
        {needPromo ? "Пополнение баланса" : "Вывод средств"}
      </span>
      <span className="font-semibold text-[14px]">
        {needPromo ? "Тип платежа" : "Тип вывода"}
      </span>
      <div className="flex gap-[10px]">
        <button
          className={clsx(
            "bg-[#1D202D] flex items-center justify-center w-[210px] h-[110px] box-border border-0 border-[#3C66CA] rounded-[10px] relative",
            payType === "ymoney" && "border-[2px]"
          )}
          onClick={() => setPayType("ymoney")}
        >
          <Icon icon="ymoney" defaultColor="#fff" />
          <span className="absolute top-[7px] right-[7px] font-semibold text-[14px] text-[#7AC877] px-[9px] py-[5px] bg-[#2D342B] rounded-[4px]">
            ЮKassa
          </span>
        </button>
        <button
          className={clsx(
            "bg-[#1D202D] flex items-center justify-center w-[210px] h-[110px] box-border border-0 border-[#3C66CA] rounded-[10px] relative cursor-not-allowed",
            payType === "skins" && "border-[2px]"
          )}
          onClick={() => setPayType("skins")}
          disabled
        >
          <Icon icon="steam" defaultColor="#fff" />
          <span className="absolute top-[7px] right-[7px] font-semibold text-[14px] text-[#7AC877] px-[9px] py-[5px] bg-[#2D342B] rounded-[4px]">
            Скины
          </span>
          <span className="absolute bottom-[14px] left-[43px font-semibold text-[10px] text-[#757575]">
            Временно недоступно
          </span>
        </button>
      </div>
      <span className="font-semibold text-[14px]">
        {needPromo ? "Сумма платежа" : "Сумма вывода"}
      </span>
      <input
        type="text"
        name={placeholderKey}
        value={values[placeholderKey]}
        onChange={handleChange}
        data-type="number"
        placeholder={placeholderTexts[placeholderKey]}
        className="rounded-[8px] px-[20px] flex items-center h-[40px] bg-[#1D202D] placeholder:text-[#757575] font-semibold text-[14px]"
      />
      {needPromo ? (
        <>
          <span className="font-semibold text-[14px]">
            Промокод (при наличии)
          </span>
          <input
            type="text"
            name="promo"
            value=""
            onChange={() => {}}
            placeholder="Введите промокод"
            className="rounded-[8px] px-[20px] flex items-center h-[40px] bg-[#1D202D] placeholder:text-[#757575] font-semibold text-[14px] cursor-not-allowed"
            disabled
          />
        </>
      ) : (
        <>
          <span className="font-semibold text-[14px]">
            Номер карты для вывода
          </span>
          <input
            type="text"
            name="cardIdentifier"
            value={cardIdentifier}
            onChange={(e) => setCardIdentifier(e.target.value)}
            placeholder="Введите номер карты"
            className="rounded-[8px] px-[20px] flex items-center h-[40px] bg-[#1D202D] placeholder:text-[#757575] font-semibold text-[14px]"
          />
        </>
      )}
    </>
  );
};

export default PayModalComps;
