import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as NativeApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { paymentReturnPath } from "../config/paymentReturn";

export default function PaymentReturnListener() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    let lastEventUrl: string | undefined;
    const open = (url: string) => {
      const path = paymentReturnPath(url);
      if (!path || disposed) return;
      navigate(path, { replace: true });
      // Also recheck if the confirmation page was already open for this order.
      window.dispatchEvent(new Event("tea-payment-return"));
      // Browser.close is unsupported on some Android versions.
      void Browser.close().catch(() => undefined);
    };
    const register = async () => {
      const listener = await NativeApp.addListener("appUrlOpen", ({ url }) => {
        if (paymentReturnPath(url)) lastEventUrl = url;
        open(url);
      });
      if (disposed) {
        await listener.remove();
        return;
      }
      removeListener = () => listener.remove();
      const launch = await NativeApp.getLaunchUrl();
      if (launch?.url && !lastEventUrl) open(launch.url);
    };
    void register().catch(() =>
      console.warn("Unable to initialize payment return links."),
    );
    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [navigate]);
  return null;
}
