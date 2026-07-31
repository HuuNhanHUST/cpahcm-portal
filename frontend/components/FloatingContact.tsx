"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, X, Phone } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5.01 3.66 9.15 8.44 9.9v-7.03H7.9v-2.87h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.87h-2.33v7.03C18.34 21.2 22 17.06 22 12.06c0-5.53-4.5-10.02-10-10.02z" />
  </svg>
);

const ZaloIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M21.731 11.233c0-4.887-4.143-8.835-9.317-8.835-5.176 0-9.319 3.948-9.319 8.835 0 2.222.951 4.298 2.585 5.922.259.256.326.634.195.957-.468 1.157-1.42 2.628-2.613 3.619-.245.204-.047.608.271.564 1.761-.247 3.659-.971 4.909-1.854.276-.195.632-.234.942-.128 1.05.356 2.164.536 3.297.536 5.174 0 9.318-3.948 9.318-8.835z" fill="currentColor"/>
    <path d="M7.747 13.916c-.309 0-.573-.243-.573-.559V9.61c0-.317.264-.56.573-.56h3.41c.309 0 .573.243.573.56s-.264.559-.573.559H8.892v.898h1.693c.309 0 .572.243.572.559s-.263.56-.572.56H8.892v.972h2.274c.309 0 .573.242.573.558s-.264.56-.573.56h-3.42z" fill="#fff"/>
  </svg>
);

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const contacts = [
    {
      id: "hotline",
      title: t("floating.hotline"),
      desc: "1900 0380",
      icon: <Phone className="w-5 h-5 text-white" />,
      color: "bg-[#25D366]", // Green like screenshot
      href: "tel:19000380"
    },
    {
      id: "facebook",
      title: t("floating.facebook"),
      desc: t("floating.msgMessenger"),
      icon: <FacebookIcon className="w-5 h-5 text-white fill-current" />,
      color: "bg-[#1877F2]", // Blue like screenshot
      href: "#"
    },
    {
      id: "zalo1",
      title: t("floating.zalo1"),
      desc: t("floating.buyAdvice"),
      icon: <ZaloIcon className="w-5 h-5 text-white" />,
      color: "bg-[#00A4D3]", // Cyan like screenshot
      href: "#"
    },
    {
      id: "zalo2",
      title: t("floating.zalo2"),
      desc: t("floating.useSupport"),
      icon: <ZaloIcon className="w-5 h-5 text-white" />,
      color: "bg-[#0068FF]", // Darker blue Zalo like screenshot
      href: "#"
    }
  ];

  return (
    <div 
      className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex flex-col gap-4 mb-2"
          >
            {contacts.map((contact, index) => (
              <motion.a
                key={contact.id}
                href={contact.href}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-end group cursor-pointer"
              >
                {/* Text Pill */}
                <div className="bg-white pl-6 pr-8 py-2.5 rounded-l-[30px] shadow-md border border-gray-100 flex flex-col items-center justify-center text-center translate-x-4 z-0 group-hover:bg-gray-50 transition-colors h-14 min-w-[200px]">
                  <span className="font-extrabold text-gray-900 text-[15px] leading-tight">{contact.title}</span>
                  <span className="text-gray-500 text-[13px]">{contact.desc}</span>
                </div>
                {/* Icon Circle */}
                <div className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${contact.color}`}>
                  {contact.icon}
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#0F1C47] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform relative z-20"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Headphones className="w-7 h-7" />}
        </motion.div>
      </button>
    </div>
  );
}
