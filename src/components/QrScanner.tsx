import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";

export const QrScanner = ({ onScanSuccess }: { onScanSuccess: (data: string) => void }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
    scanner.render((decodedText) => {
      onScanSuccess(decodedText); // عند مسح الكود، يتم إرجاع الرابط
      scanner.clear(); // إيقاف الكاميرا بعد القراءة
    }, (error) => console.log(error));
  }, []);

  return <div id="reader" style={{ width: "300px" }}></div>;
};