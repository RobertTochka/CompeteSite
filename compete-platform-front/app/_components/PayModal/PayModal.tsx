import React, { Dispatch, ReactNode, SetStateAction, useState } from "react";
import ModalWindow from "../ModalWindow";
import { IDefaultModalProps } from "../ChangeTeamNameModal/ChangeTeamNameModal";
import { Formik } from "formik";
import { Information } from "../Loading/Loading";
import PayModalComps from "./PayModalComps";
import toast from "react-hot-toast";
import Link from "next/link";

interface IPayModalProps extends IDefaultModalProps {
  buttonText?: string;
  initialValues: { [key: string]: any };
  validationScheme: any;
  placeholderTexts: { [key: string]: string };
  needPromo: boolean;
  setCardIdentifier: Dispatch<SetStateAction<string>>;
  cardIdentifier: string;
}
export const PayModal = ({
  onSubmit,
  buttonText,
  initialValues,
  validationScheme,
  placeholderTexts,
  isLoading,
  needPromo,
  setCardIdentifier,
  cardIdentifier,
  ...rest
}: IPayModalProps) => {
  const [checked, setChecked] = useState(false);
  return (
    <ModalWindow {...rest}>
      <Formik
        validationSchema={validationScheme}
        initialValues={initialValues}
        onSubmit={(values, {}) => {
          checked
            ? onSubmit(values)
            : toast.error("Вы должны согласиться с условиями");
        }}
      >
        {({ handleSubmit, handleChange, errors, values, touched }) => (
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col gap-y-[10px]"
          >
            {Object.keys(initialValues).map((key) => (
              <>
                <PayModalComps
                  placeholderKey={key}
                  values={values}
                  handleChange={handleChange}
                  placeholderTexts={placeholderTexts}
                  needPromo={needPromo}
                  setCardIdentifier={setCardIdentifier}
                  cardIdentifier={cardIdentifier}
                />
                {errors[key] &&
                  touched[key] &&
                  typeof errors[key] === "string" && (
                    <div className="text-left text-[16px] font-medium text-negative mt-[7px]">
                      {errors[key] as ReactNode}
                    </div>
                  )}
              </>
            ))}
            {isLoading && (
              <Information size={30} loading={isLoading}></Information>
            )}
            <button
              type="submit"
              className="text-[14px] font-semibold rounded-[8px] bg-[#3C66CA] hover:bg-secondaryBlue w-full flex items-center justify-center py-[15px] mt-[5px]"
            >
              {buttonText}
            </button>
            <label className="flex gap-[7px] mx-auto items-center">
              <input
                type="checkbox"
                checked={checked}
                onClick={() => setChecked(!checked)}
                className="appearance-none w-[20px] h-[20px] rounded-[6px] bg-[#2E2E2E] cursor-pointer checked:bg-no-repeat checked:bg-center checked:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTEiIHZpZXdCb3g9IjAgMCAxMiAxMSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEgNkw0LjEzNzQ3IDkuMTM3NDdDNC41ODM2OSA5LjU4MzY5IDUuMzI2NTggOS41MTAxMiA1LjY3NjYzIDguOTg1MDZMMTEgMSIgc3Ryb2tlPSIjM0M2NkNBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K')]"
              />
              <span className="font-semibold text-[12px]">
                Я ознакомился и согласен с{" "}
                <Link href={""} className="text-[#757575]">
                  условиями оферты
                </Link>
              </span>
            </label>
          </form>
        )}
      </Formik>
    </ModalWindow>
  );
};
