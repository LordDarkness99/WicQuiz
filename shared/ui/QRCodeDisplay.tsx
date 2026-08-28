"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  url: string;
  size?: number;
}

export default function QRCodeDisplay({
  url,
  size = 200,
}: QRCodeDisplayProps) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-md inline-block">
      <QRCodeSVG
        value={url}
        size={size}
        bgColor="#FFFFFF"
        fgColor="#1B2B5E"
        level="M"
      />
    </div>
  );
}
