"use client";
import { ReactNode, useEffect, useState } from "react";
import * as Yup from "yup";
import { PaymentMethod } from "../PaymentMethod/PaymentMethod";
import { ResultModal } from "../ResultModal/ResultModal";
import { PayModal } from "../PayModal/PayModal";
import { PayoutModal } from "../PayoutModal/PayoutModal";
import { ConfirmationType } from "@/app/_utils/types";
import {
  useDoPayMutation,
  useDoPayoutMutation,
} from "@/app/_fetures/lib/api/publicLobbiesApi";
import { useSearchParams } from "next/navigation";
import { handleError } from "@/app/_utils/functions";

interface PaymentProps {
  children?: (args: { onTopUp: () => void; onPayout: () => void }) => ReactNode;
}

type PayVariant = "bank-card" | "ymoney" | "sberpay" | "sbp" | "balance-phone";

const PAYMENT_METHODS: { text: string; icon: PayVariant }[] = [
  {
    text: "Банковская карта",
    icon: "bank-card",
  },
  {
    text: "ЮMoney",
    icon: "ymoney",
  },
  {
    text: "SberPay",
    icon: "sberpay",
  },
  {
    text: "СБП",
    icon: "sbp",
  },
  {
    text: "Баланс телефона",
    icon: "balance-phone",
  },
];
const phoneValidationScheme = Yup.object().shape({
  phone: Yup.string()
    .matches(
      /^7\d{10}$/,
      "Номер телефона должен быть в формате 7XXXXXXXXXX и содержать 11 цифр"
    )
    .required("Номер телефона является обязательным"),
});

export default function Payment({ children }: PaymentProps) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPayModalLikePayout, setShowPayModalLikePayout] = useState(false);
  const searchParams = useSearchParams();
  const [resultIcon, setResultIcon] = useState<string | undefined>(undefined);
  const [cardIdentifier, setCardIdentifier] = useState<string>("");
  const [doPayout, { error: payoutError, isLoading: payoutLoading }] =
    useDoPayoutMutation();
  const [doPay, { isLoading: payLoading, error: payError }] =
    useDoPayMutation();
  const [modalError, setModalError] = useState<undefined | string>(undefined);
  const [sucessMessage, setSuccessMessage] = useState<undefined | string>(
    undefined
  );
  const [validationSchema, setValidationScheme] = useState(Yup.object());
  const [placeholderText, setPlaceholderText] = useState({});

  useEffect(() => {
    setValidationScheme(
      showPayModalLikePayout
        ? Yup.object().shape({
            amount: Yup.number()
              .min(350, "Минимум 350 рублей")
              .required("Значение является обязательным"),
          })
        : Yup.object().shape({
            amount: Yup.number()
              .min(100, "Минимум 100 рублей")
              .required("Значение является обязательным"),
          })
    );
    setPlaceholderText({
      amount: showPayModalLikePayout
        ? "Введите сумму (от 350 R)"
        : "Введите сумму платежа (от 100 R)",
    });
  }, [showPayModalLikePayout]);

  useEffect(() => {
    const fromShop = searchParams.get("fromShop");
    if (typeof fromShop === "string") setSuccessMessage(fromShop);
  }, [searchParams]);
  useEffect(() => {
    if (payoutError) setModalError(handleError(payoutError));
    if (payError) setModalError(handleError(payError));
  }, [payoutError, payError]);
  const onPayoutComplete = ({ amount }: { amount: string }) => {
    doPayout({ amount: parseFloat(amount), identifier: cardIdentifier })
      .unwrap()
      .then((result) => {
        setSuccessMessage(result);
      })
      .finally(() => {
        setShowPayModal(false);
        setShowPayModalLikePayout(false);
      });
  };
  const onResultChecked = () => {
    setSuccessMessage(undefined);
    setModalError(undefined);
    setShowPayModalLikePayout(false);
  };
  const onPayComplete = ({ amount }: { amount: string }) => {
    doPay({
      amount: parseFloat(amount),
      userId: null,
      variant: "ymoney",
      identifier: "",
    })
      .unwrap()
      .then((e) => {
        if (e.confirmation.type == ConfirmationType.Redirect)
          window.open(e.confirmation.confirmationUrl);
        else if (e.confirmation.type == ConfirmationType.External) {
          setResultIcon("/img/phone.png");
          setSuccessMessage(e.text);
        }
      })
      .finally(() => setShowPayModal(false));
  };
  const onTopUp = () => {
    setShowPayModal(true);
  };
  const onPayout = () => {
    setShowPayModal(true);
    setShowPayModalLikePayout(true);
  };
  return (
    <>
      {showPayModal && (
        <PayModal
          initialValues={
            showPayModalLikePayout ? { amount: "" } : { amount: "" }
          }
          validationScheme={validationSchema}
          isLoading={payoutLoading || payLoading}
          onClose={() => {
            setShowPayModal(false);
            setShowPayModalLikePayout(false);
          }}
          onSubmit={showPayModalLikePayout ? onPayoutComplete : onPayComplete}
          placeholderTexts={placeholderText}
          buttonText={showPayModalLikePayout ? "Вывести" : "Оплатить"}
          needPromo={!showPayModalLikePayout}
          setCardIdentifier={setCardIdentifier}
          cardIdentifier={cardIdentifier}
        ></PayModal>
      )}
      {(sucessMessage || modalError) && (
        <ResultModal
          onClose={onResultChecked}
          successMessage={sucessMessage}
          errorMessage={modalError}
          img={resultIcon}
        ></ResultModal>
      )}
      {children?.({ onTopUp, onPayout })}
    </>
  );
}
