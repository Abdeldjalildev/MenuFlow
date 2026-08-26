import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef } from "react";

export const QrScanner = ({ onScanSuccess }: { onScanSuccess: (data: string) => void }) => {
  const onScanSuccessRef = useRef(onScanSuccess);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);

    scanner.render((decodedText) => {
      onScanSuccessRef.current(decodedText);
      void scanner.clear();
    }, (error) => console.log(error));

    return () => {
      void scanner.clear();
    };
  }, []);

  return <div id="reader" style={{ width: "300px" }}></div>;
};