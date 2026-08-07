"use client";

import { useRouter } from "next/navigation";

import { JSX, useState, useEffect } from "react";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const ICONS: Record<string, { bg: string; path: JSX.Element }> = {
  Facebook:  { bg: "#1877f2", path: <svg viewBox="0 0 24 24" fill="white" style={{width:"100%",height:"100%"}}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  Instagram: { bg: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)", path: <svg viewBox="0 0 24 24" fill="white" style={{width:"100%",height:"100%"}}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
  Tiktok:    { bg: "#010101", path: <svg viewBox="0 0 24 24" fill="white" style={{width:"100%",height:"100%"}}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg> },
  YouTube:   { bg: "#ff0000", path: <svg viewBox="0 0 24 24" fill="white" style={{width:"100%",height:"100%"}}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  Pinterest: { bg: "#e60023", path: <svg viewBox="0 0 24 24" fill="white" style={{width:"100%",height:"100%"}}><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg> },
  X:         { bg: "#000000", path: <svg viewBox="0 0 24 24" fill="white" style={{width:"100%",height:"100%"}}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
};

function Icon({ name, size }: { name: string; size: number }) {
  const cfg = ICONS[name];
  if (!cfg) return <div style={{ width: size, height: size, borderRadius: size * 0.25, background: "#e2e8f0", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div style={{ width: size * 0.56, height: size * 0.56 }}>{cfg.path}</div>
    </div>
  );
}

const EGETINNZ_LOGO =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy" +
  "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAwADADASIA" +
  "AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA" +
  "AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3" +
  "ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm" +
  "p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA" +
  "AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx" +
  "BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElK" +
  "U1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3" +
  "uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDstG0m" +
  "z0PSoLCxhWKKJAOByx7sfUmtuPSb6VA6252npuIFN0qNZNSt1cZXOcfQZrL1fVp7i7mRZX27ypIY" +
  "joeg9q/NaFCFWDr17tttafe23r3PUxGIVFWRfu9G1hh5cFrwereYv5DmqH/CMax/z5/+RF/xrMEs" +
  "zHCyzEnoA7E1k6pq9xExtopZ0fHzMWYEewz/ADr1MPQw792EJfev8jwsXi1/EqGrrmla3ptk0v2C" +
  "QRgZeZSG8sfQc/j2rznxDZQ32i3SyqCyRs6N3VgM5Fdr4Q1O8g8TWMS3ErQ3EoiljdyyspB6g1zv" +
  "i5IbBtahUhIo3mjQe2TgCvbo0IUknS7ni1KjqSjWi2tbfkeo6Leeb4gs44/9Xlsn+98prDucm7mA" +
  "GT5rYH4mtDwz/wAjDZ/Vv/QTXKazqjNezxWxwqzNlum4hjx9K8bD4bmw8YQ25n+SPYxeLsvaVHqe" +
  "oSQP4Z0DzLDTnvr87QVQZLMepJ7KKr28M3i/Q7i313SGsbhTiNmU8HGQyE8j3FWr+6v9a8LxXvh2" +
  "5CXLhZF+6dw/iQ54B/qK5mKH4iSWs8zXQhMaFljk8rdIR2GAQPqa+qUY07QitLEVZ+9azcWuiVjj" +
  "/DhEHi7SklID/bFTHqwJFcj48nkl8Q68HbhLidVA6AZNaHhS6mu/iBo0szEsb1ePTk5/Wsvxv/yM" +
  "PiH/AK+Z/wCZpUqfJGzPLpQUaa/xHpOg61GnizThv2WwkKM5/iJUgfQZIrG1nSb6x1e6hmtZgfNd" +
  "lIjJDKSSCCBWHY3sGoWcdxA4dHX8j3B963W8fa7pNmsSak7YGI0dVc/mRnFcFGlGEfZWMpVfa3hW" +
  "umn/AEiO01zWvDqM9ibtN5z5QhZlY+pBGPxrN1bxf4x1q2e2u57xYHGGjgtjGGHocDJH41Ifih4v" +
  "JP8AxNQP+3eP/Ckb4peLlUs2rKAO/wBnj/wr0acORWubwlCMeVTl/XzG+AdF1G48ZadOtnMkFrMJ" +
  "ppZIyiIqg9Sa47xhqUepa5rNxbNutpbiZ0YfxAscGtXWviL4o120eyutWl+yOMPHGix7x6MVGSPa" +
  "uOvJVitX3HquAPWtEdNOMVaMddT/2Q==";

const FIBEI_LOGO =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy" +
  "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAwADADASIA" +
  "AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA" +
  "AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3" +
  "ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm" +
  "p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA" +
  "AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx" +
  "BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElK" +
  "U1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3" +
  "uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3Piii" +
  "krI0CimtIiIzuwVVGSxOABUVre2t6jPa3EcyqcEo2cGldXsOzav0J6WkopiIbyY21lcThQxiiZwC" +
  "euATj9K5hvFN2mmrdNDAzNbtMsaxyr0MYxlsH+PsDnsa6eYJMjxOoZHUqynuCMEVWn0yxuokintk" +
  "dEiMKqc8IcfL9PlX8qDCrGpL4HY5zUtfS50i5srqGRbpnkTZChB2ptO4q2GGdw+Xqe1TeGbkFp9R" +
  "vnt7V5v3CRKuwEI20nHrnitj+wtM2qos0+Vy+dzbiTjOTnJzgcE9hU50608ryjbR+XuZtp9WbcT+" +
  "J5rOVJSmpvdf1+pdKpiIQcG1Z/8AA/yHHUrMY/0qHkkD5xzirQOaojSLDbgWcQHTgY9fT/eP51dV" +
  "AigdAOBzmtRx5vtDDHt6H201hhdw5YGmGYhjxxQzFo2IyKm9ynpuK0ofhTz3xSNI2wgLuJ9DUCjB" +
  "IXtTwwJwOT61NxKQ+K4KthgQvfIqaOQySMSMADABqlIFI+eTn0pYVbYRvYfShMOZ9T//2Q==";

const DIGITIMMERSE_LOGO = "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zzzzzzzzzzzyoIQAP7zzzzzzzzzzzzzzzzzzypZeALzzzzzzzzzzzzzzzzzzyy45XdzzzzzzzzzzzzzzzzzzzzzzhbTzzzzzzzzzzzzzz7/PPPPnObv/AB/LXz5/K288888/XvpN7jUfNkm8Tu+QuDe8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888//EABwRAAMAAwEBAQAAAAAAAAAAAAABERAxQCFwMP/aAAgBAwEBPxD6k2J4peV7FvDFyvYt4fM9i2UfM9i3hiXK0JYnROGlKUpS4pRuFKUpS/gz0mPRCIQhCExCeCRPpv8A/8QAHhEBAQEAAgMBAQEAAAAAAAAAAREAITEQQEFhcCD/2gAIAQIBAT8Q/qKXMAdELn4Osgxmnq9u6fAiO5j1e3dPj48dXqdu6ddk3x4EB6nfunwtHq4061hNQTfcW1YAIevz2egZrp+jkk/cAw5wEXRLMPQw2DNMJDKTF3ySfuL+OA/HcFwrJosjiyzDf9NAyPgy7HzXnlibcxLng4tNDBhTrHNkiveRMCk3aMwuMxa6wSsxZEwT+l//xAAoEAEAAQMCBgIDAQEBAAAAAAABEQAhMUFREGFxgZGhUPAwscEgkNH/2gAIAQEAAT8Q/wCmaeXM1km0KaRUNiyXCY0Xj19zPUtXRlNmi4W3TwJo9sCr7FyjiLUQd0vqoocugr1GTvV/jeMaVqPwNxnubPMpqgy3Karmf+OtP2OVA6JUvKsS/RMnM90HAwokR1PjMMeKFUjproHhntxcsELmIv8A1O/L4zDHigRJPII4trHNCGYp14N9xJPi8MeKcVz2fB4yIy+xfxT8VhjxTivsd3ilF0E86fisF9UiiXiKVTkA1MNOVNf3PGSuX9Dp8XgRJFX3G6votlIGwK0jOUrxYhEX2RL7X4vDGl9hur6rZRqsM9zEHtOPRGll582O/wAZhjS+w3V9VsqN6c9kn3Dw8C3GGlToFOQUaF46F5a8+3xFv8MY0vsN1c2yUTDMVIwSwwWByKZANNi5avYoiKxAccho98/iZ4wq0Ssr5vHaiIHEBhsS8UAH0tXsUxMN8vmkXF2aCJebUe4JMSIGnAfi290vv5D7DdX1Wz5BJaTB7axiliBeKVZaLsBJoRkprSFim1hPwPf8N/x2424Wq3+71f8AM3snq3ZnItTIUjvQo2ScjQEhvDkbiCetCWv0iA0ScmuKYYoc5JakqjzwEmW4BqxfbGafS0w/dLE9qWqjG7yEC/WaUo2nWQyIje3qsQ4WUwGwb1NO83g7FSt8hNYFcmw1OgaWIiPCajKpikIltlKKCCRCm46BVmV9ujgLOPHDZvpEs3DbQ6TrQqwiwGzQKxzIMAgKCr0gE7mC0jZ7VfSI3Wgc1gqVIijDNgmVqXwyRddKIxyoEvKE5DOSuXRkyfEhOgtU6AIzWBXOwaQcIWCBlYG1MjldghYGL8opqGVkKzE2CbYpVoYSIRw2Y7U9W1KGOQRExeSMVNPD3AsF6JKATOJI4poHOQJs3UVphN0ESEFlWFwF2r3IvYvCADDEIEzi1/yfZc6svOoJe4u1EZJ3QwA64aWANuiy/wBK9v8AtUyhMXUER+u1AFEdAoW6SLeedZMSPikg9quRYjgsNjtwG9v+yvUqfc7uPwm30kJmSz3el2om+sbXuLdZaspQhLzh/XSK9b+lfe76l4KIwdblfw8qdYTGQmw8pR55UOgyYc/sPUV97lp7jaTFmJEz14GUVsO5wMot2hKQsIZYWaqCUJEJDaEJJxRNXY7LDM4gmd6dyrlhwBietMUkR+/pE70zEOS0SIr5A719xuoNKoRMdGMYpg6TONbAKfFKgBMAe6AgkMltIqODEYRJAABLYNfypWeC0t14cETprLdYJ91Dw+MAIvW81DcYKDZP7S4nOOzduTJTJ7WFeYVBcNYD3Bnu1HcPIldYpIXGEASM26VLcLKUo1ZAKDJ/VGgoKk0kigZ6lEoMeqBcAiRBM361IiEQWZCbUkRLgQym7PKaDfsQcCRHelHgMIi86UumIEBLMe6dIJBLLU7Sd6YmzgAnlI1i3doaWYtIFZv1oVPLgy0scEGsMgsADZFqsdzFBk/qpxhoMkkScymxqoEAiJ4aSTUCHjiDnrZq7q2BHzRYGobLNiLB0oR9QYFZjghD5bKDao/6T//Z";

const ACCOUNT_ICONS: Record<string, ({ size }: { size: number }) => JSX.Element> = {
  "eGetinnz PH": ({ size }) => (
    <img src={`data:image/jpeg;base64,${EGETINNZ_LOGO}`} style={{ width: size, height: size, borderRadius: size * 0.22, flexShrink: 0, objectFit: "cover" }} />
  ),
  "eGetinnz USA": ({ size }) => (
    <img src={`data:image/jpeg;base64,${EGETINNZ_LOGO}`} style={{ width: size, height: size, borderRadius: size * 0.22, flexShrink: 0, objectFit: "cover" }} />
  ),
  "Fibei Travel": ({ size }) => (
    <img src={`data:image/jpeg;base64,${FIBEI_LOGO}`} style={{ width: size, height: size, borderRadius: size * 0.22, flexShrink: 0, objectFit: "cover" }} />
  ),
  "Digitimmerse": ({ size }) => (
    <img src={`data:image/jpeg;base64,${DIGITIMMERSE_LOGO}`} style={{ width: size, height: size, borderRadius: size * 0.22, flexShrink: 0, objectFit: "cover", border: "1.5px solid #d1d5db", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }} />
  ),
};

function Avatar({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  const AccIcon = ACCOUNT_ICONS[name];
  if (AccIcon) return <AccIcon size={size} />;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.22, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.44 }}>{name[0]}</span>
    </div>
  );
}

// ── Stat Card Icons ───────────────────────────────────────────────────────────
function FollowerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" style={{width:16,height:16}}>
      <circle cx="9" cy="7" r="4"/><path d="M2 21c0-4 3.1-7 7-7s7 3 7 7"/>
      <circle cx="18" cy="8" r="2.5" strokeWidth="1.6"/><path d="M22 20c0-2.8-1.8-5-4-5.5" strokeWidth="1.6"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" style={{width:16,height:16}}>
      <circle cx="12" cy="12" r="9"/>
      <polyline points="8.5 12 11 14.5 15.5 9.5"/>
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" style={{width:16,height:16}}>
      <rect x="3" y="4" width="18" height="17" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <rect x="7" y="13" width="2.5" height="2.5" rx="0.5" fill="#64748b" stroke="none"/>
      <rect x="11" y="13" width="2.5" height="2.5" rx="0.5" fill="#64748b" stroke="none"/>
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" style={{width:16,height:16}}>
      <path d="M3 20h18M5 20V14M9 20V9M13 20V12M17 20V5" strokeLinecap="round"/>
      <polyline points="5,14 9,9 13,12 17,5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4"/>
    </svg>
  );
}

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface Pair {
  plt: string;
  val: string;
  delta: string;
  up: boolean;
}

export interface AccountPerformance {
  name: string;
  color: string;
  pairs: Pair[];
}

export interface ScheduledPost {
  title: string;
  account: string;
  aColor: string;
  date: string;
  platform: string;
}

export interface ConnectedAccount {
  platform: string;
  name: string;
  handle: string;
}

export interface SummaryPage {
  name: string;
  plt: string;
  engagement: string;
  third: string;
  thirdLabel: string;
  posts: string;
  avgLikes: string;
  engRate: number;
}

export interface EngagementData {
  plt: string;
  post: string;
  likes: number;
  comments: number;
  shares: number;
  total: number;
}

export interface DashboardData {
  kpis: {
    total_followers: string;
    total_posts: string;
    total_scheduled: number;
    total_engagement: string;
    followers_data: { plt: string; val: string }[];
    posted_data: { plt: string; val: number }[];
  };
  account_performance: AccountPerformance[];
  scheduled_posts: ScheduledPost[];
  connected_accounts: ConnectedAccount[];
  summary_pages: SummaryPage[];
  engagement_data: EngagementData[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function CloseBtn({ onClick }: { onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick}
      style={{ background: h ? "#e2e8f0" : "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 36px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#374151", transition: "all 0.15s", fontFamily: "inherit" }}>
      Close
    </button>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function SmBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ border: "1px solid #e2e8f0", borderRadius: 7, padding: "3px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: h ? "#1e3a5f" : "#fff", color: h ? "#fff" : "#1a202c", transition: "all 0.15s", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [modal, setModal] = useState<"followers"|"posted"|"scheduled"|"engagement"|null>(null);
  const [accModal, setAccModal] = useState<AccountPerformance | null>(null);
  const [summaryModal, setSummaryModal] = useState<SummaryPage | null>(null);
  const [viewAllSummary, setViewAllSummary] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard/overview", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard overview");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleViewSchedule = () => {
    setModal(null);
    router.push("/schedule?highlight=scheduled-posts");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "inherit" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #1e3a5f", borderRadius: "50%", width: 40, height: 40, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "#64748b", fontSize: 15, fontWeight: 500 }}>Loading Dashboard...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Inter',sans-serif", color: "#1a202c", fontSize: 15 }}>

      {/* ── MODAL: Total Followers ── */}
      {modal === "followers" && (
        <Overlay onClose={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 300, width: "90vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ background: "#1e3a5f", height: 6 }} />
            <div style={{ padding: "26px 22px 22px" }}>
              <h2 style={{ color: "#1e3a5f", fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Total Followers</h2>
              <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 18px" }}>Overview for <strong style={{ color: "#1a202c" }}>Egetinnz</strong> total followers performance.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(data?.kpis?.followers_data || []).map(r => (
                  <div key={r.plt} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name={r.plt} size={28} /><span style={{ color: "#1a202c", fontWeight: 500, fontSize: 15 }}>{r.plt}</span></div>
                    <span style={{ color: "#1a202c", fontWeight: 700, fontSize: 19 }}>{r.val}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid #e2e8f0", margin: "16px 0 14px", paddingTop: 12, textAlign: "center" }}>
                <span style={{ color: "#1a202c", fontWeight: 700, fontSize: 16 }}>Total: {data?.kpis?.total_followers || "0"} Followers</span>
              </div>
              <div style={{ textAlign: "center" }}><CloseBtn onClick={() => setModal(null)} /></div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: Total Posted Content ── */}
      {modal === "posted" && (
        <Overlay onClose={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 340, width: "90vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ background: "#1e3a5f", height: 6 }} />
            <div style={{ padding: "22px 26px 24px" }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 20px", color: "#1e3a5f" }}>Total Posted Content</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {(data?.kpis?.posted_data || []).map(r => (
                  <div key={r.plt} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name={r.plt} size={30} /><span style={{ fontSize: 16, fontWeight: 500 }}>{r.plt}</span></div>
                    <span style={{ fontSize: 26, fontWeight: 700 }}>{r.val}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid #e8edf3", margin: "18px 0 14px" }} />
              <p style={{ fontSize: 17, fontWeight: 700, color: "#2563eb", margin: "0 0 16px", textAlign: "center" }}>Total: {data?.kpis?.total_posts || "0"} Posts</p>
              <div style={{ textAlign: "center" }}><CloseBtn onClick={() => setModal(null)} /></div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: Total Scheduled Content ── */}
      {modal === "scheduled" && (
        <Overlay onClose={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 680, width: "90vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ background: "#1e3a5f", height: 6 }} />
            <div style={{ padding: "22px 26px 24px", maxHeight: "85vh", overflowY: "auto" }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 20px", color: "#1e3a5f" }}>Total Scheduled Content</h2>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {["Post Title","Date & Time","Platform","Status","Action"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 14, fontWeight: 600, color: "#64748b" }}>{h}</th>
                    ))}
                  </tr>
                  <tr><td colSpan={5} style={{ padding: "8px 0" }} /></tr>
                </thead>
                <tbody>
                  {(data?.scheduled_posts || []).map((p, i) => (
                    <tr key={i} style={{ background: "#f8fafc", borderBottom: "4px solid #fff" }}>
                      <td style={{ padding: "14px 16px", fontSize: 15 }}>{p.title}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>{p.date}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name={p.platform} size={22} /><span style={{ fontSize: 13 }}>{p.platform}</span></div>
                      </td>
                      <td style={{ padding: "12px 14px" }}><span style={{ color: "#16a34a", fontWeight: 600, fontSize: 14 }}>Scheduled</span></td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={handleViewSchedule}
                          style={{
                            background: "none", border: "none", color: "#2563eb",
                            fontWeight: 600, fontSize: 14, cursor: "pointer",
                            padding: 0, fontFamily: "inherit",
                            textDecoration: "underline", textUnderlineOffset: 2,
                          }}>
                          View Schedule
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <div style={{ textAlign: "center", marginTop: 20 }}><CloseBtn onClick={() => setModal(null)} /></div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: Total Engagement ── */}
      {modal === "engagement" && (
        <Overlay onClose={() => setModal(null)}>
          <div style={{ background: "#f0f4f8", borderRadius: 16, maxWidth: 740, width: "90vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", border: "1px solid #dde3ec" }}>
            <div style={{ background: "#1e3a5f", height: 10 }} />
            <div style={{ padding: "28px 30px 26px", maxHeight: "85vh", overflowY: "auto" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px", color: "#1a202c" }}>Total Engagement Per Post</h2>
              <div style={{ borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", background: "#fff" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Platform","Page","Post","Likes","Comments","Shares","Total"].map(col => (
                        <th key={col} style={{ textAlign: "left", padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#64748b", borderBottom: "1px solid #e8edf3" }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.engagement_data || []).map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Icon name={r.plt} size={28} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{r.plt}</span>
                          </div>
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <img src={`data:image/jpeg;base64,${EGETINNZ_LOGO}`} style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>Egetinnz</span>
                          </div>
                        </td>
                        <td style={{ padding: "13px 14px", fontSize: 13 }}>{r.post}</td>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" fill="white" style={{width:12,height:12}}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{r.likes}</span>
                          </div>
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" fill="white" style={{width:12,height:12}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{r.comments}</span>
                          </div>
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" fill="white" style={{width:12,height:12}}><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12" strokeWidth="2.5" stroke="white" fill="none"/></svg>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{r.shares}</span>
                          </div>
                        </td>
                        <td style={{ padding: "13px 14px", fontWeight: 700, fontSize: 14 }}>{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #dde3ec", margin: "22px 0 16px", paddingTop: 16, textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f", margin: 0 }}>Total Engagement: {data?.kpis?.total_engagement || "0"}</p>
              </div>
              <div style={{ textAlign: "center" }}><CloseBtn onClick={() => setModal(null)} /></div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: Account Performance Detail ── */}
      {accModal && (
        <Overlay onClose={() => setAccModal(null)}>
          <div style={{ background: "#fff", borderRadius: 14, maxWidth: 420, width: "90vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", border: "1px solid #dde3ec" }}>
            <div style={{ background: "#1e3a5f", height: 6 }} />
            <div style={{ padding: "22px 26px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={accModal.name} color={accModal.color} size={40} />
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#1a202c" }}>{accModal.name}</span>
                </div>
                <button
                  onClick={() => setAccModal(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "#94a3b8", fontSize: 17, lineHeight: 1, fontFamily: "inherit", transition: "color 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
                >✕</button>
              </div>
              <div style={{ borderTop: "1px solid #e8edf3", marginBottom: 16 }} />

              <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Followers
              </p>
              <div style={{ display: "flex", gap: 24 }}>
                {accModal.pairs.map(p => (
                  <div key={p.plt} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name={p.plt} size={38} />
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{p.plt}</p>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a202c", lineHeight: 1 }}>{p.val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: View All Summary Pages ── */}
      {viewAllSummary && (
        <Overlay onClose={() => setViewAllSummary(false)}>
          <div style={{
            background: "#fff", borderRadius: 16, maxWidth: 700,
            width: "94vw", overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.22)", border: "1px solid #dde3ec"
          }}>
            <div style={{ background: "#1e3a5f", height: 6 }} />
            <div style={{ padding: "24px 26px 26px", maxHeight: "85vh", overflowY: "auto" }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a202c" }}>All Pages Summary</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Performance overview across all connected pages.</p>
                </div>
                <button
                  onClick={() => setViewAllSummary(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "#94a3b8", fontSize: 18, lineHeight: 1, fontFamily: "inherit" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
                >✕</button>
              </div>

              <div style={{ borderTop: "1px solid #e8edf3", marginBottom: 20 }} />

              {/* Table */}
              <div style={{ borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", background: "#fff" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Page","Platform","Engagement","Reach / Views","Posts","Avg. Likes","Eng. Rate","Action"].map(col => (
                          <th key={col} style={{ textAlign: "left", padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "#64748b", borderBottom: "1px solid #e8edf3", whiteSpace: "nowrap" }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.summary_pages || []).map((pg, i) => (
                        <tr key={pg.name} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc", borderBottom: "1px solid #f1f5f9" }}>
                          {/* Page name */}
                          <td style={{ padding: "13px 14px" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#1a202c" }}>{pg.name}</span>
                          </td>
                          {/* Platform */}
                          <td style={{ padding: "13px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <Icon name={pg.plt} size={26} />
                              <span style={{ fontSize: 13 }}>{pg.plt}</span>
                            </div>
                          </td>
                          {/* Engagement */}
                          <td style={{ padding: "13px 14px", fontSize: 13, fontWeight: 600 }}>{pg.engagement}</td>
                          {/* Reach/Views */}
                          <td style={{ padding: "13px 14px" }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{pg.third}</span>
                              <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>{pg.thirdLabel}</span>
                            </div>
                          </td>
                          {/* Posts */}
                          <td style={{ padding: "13px 14px", fontSize: 13 }}>{pg.posts}</td>
                          {/* Avg Likes */}
                          <td style={{ padding: "13px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <svg viewBox="0 0 24 24" fill="#ef4444" style={{width:13,height:13,flexShrink:0}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                              <span style={{ fontSize: 13 }}>{pg.avgLikes}</span>
                            </div>
                          </td>
                          {/* Eng Rate bar */}
                          <td style={{ padding: "13px 14px", minWidth: 100 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 99, height: 6, overflow: "hidden" }}>
                                <div style={{ width: `${pg.engRate * 10}%`, height: "100%", background: "linear-gradient(90deg,#1e3a5f,#2563eb)", borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", flexShrink: 0 }}>{pg.engRate}%</span>
                            </div>
                          </td>
                          {/* Action */}
                          <td style={{ padding: "13px 14px" }}>
                            <button
                              onClick={() => { setViewAllSummary(false); setSummaryModal(pg); }}
                              style={{ border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#fff", color: "#1a202c", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#1e3a5f"; e.currentTarget.style.color = "#fff"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#1a202c"; }}
                            >Details</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: "1px solid #e8edf3", margin: "20px 0 16px", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>Showing <strong style={{ color: "#1a202c" }}>{(data?.summary_pages || []).length}</strong> pages total</span>
                <CloseBtn onClick={() => setViewAllSummary(false)} />
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── MODAL: Summary Page Details ── */}
      {summaryModal && (
        <Overlay onClose={() => setSummaryModal(null)}>
          <div style={{
            background: "#fff", borderRadius: 16, maxWidth: 400,
            width: "90vw", overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.22)", border: "1px solid #dde3ec"
          }}>
            {/* Navy top bar */}
            <div style={{ background: "#1e3a5f", height: 6 }} />
            <div style={{ padding: "24px 26px 26px" }}>

              {/* Header: platform icon + page name + X close */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name={summaryModal.plt} size={36} />
                  <div>
                    <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1a202c" }}>{summaryModal.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{summaryModal.plt} Page</p>
                  </div>
                </div>
                <button
                  onClick={() => setSummaryModal(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "#94a3b8", fontSize: 17, lineHeight: 1, fontFamily: "inherit", transition: "color 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#374151")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
                >✕</button>
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid #e8edf3", marginBottom: 20 }} />

              {/* 4 Stat tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Engagement",              value: summaryModal.engagement, bg: "#eff6ff", border: "#bfdbfe", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{width:18,height:18}}><path d="M3 20h18M5 20V14M9 20V9M13 20V12M17 20V5" strokeLinecap="round"/></svg> },
                  { label: summaryModal.thirdLabel,   value: summaryModal.third,      bg: "#f0fdf4", border: "#bbf7d0", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" style={{width:18,height:18}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
                  { label: "Total Posts",             value: summaryModal.posts,      bg: "#fefce8", border: "#fde68a", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" style={{width:18,height:18}}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
                  { label: "Avg. Likes",              value: summaryModal.avgLikes,   bg: "#fff1f2", border: "#fecdd3", icon: <svg viewBox="0 0 24 24" fill="#ef4444" style={{width:18,height:18}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: stat.bg,
                    border: `1px solid ${stat.border}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}>
                    <div style={{ marginBottom: 8 }}>{stat.icon}</div>
                    <p style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 700, color: "#1a202c", lineHeight: 1 }}>{stat.value}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontWeight: 500 }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Engagement rate progress bar */}
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 20, border: "1px solid #e8edf3" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Engagement Rate</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#2563eb" }}>{summaryModal.engRate}%</span>
                </div>
                <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{
                    width: `${summaryModal.engRate}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #1e3a5f, #2563eb)",
                    borderRadius: 99,
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>0%</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>100%</span>
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <CloseBtn onClick={() => setSummaryModal(null)} />
              </div>
            </div>
          </div>
        </Overlay>
      )}
      {/* ── Page content ── */}
      <div className="dash-content">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Overview of all social media accounts performance.</p>

        {/* ── Two-column layout ── */}
        <div className="dash-two-col">

          {/* ── LEFT ── */}
          <div className="dash-left">

            {/* Overall Performance card */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", border: "1px solid #e8edf3", marginTop: "25px"}}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Overall Performance <span style={{ fontWeight: 400 }}>(All Accounts)</span></p>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 18px" }}>Combined analytics for Egetinnz PH, Egetinnz USA, Fibei Travel, and Digitimmerse.</p>
              <div className="dash-stat-cards">
                <StatCard title="Total Followers"         value={data?.kpis?.total_followers || "0"} sub="As of today" icon={<FollowerIcon />} onClick={() => setModal("followers")} />
                <StatCard title="Total Posted Content"    value={data?.kpis?.total_posts || "0"}    sub="Published Post"          icon={<CheckIcon />}   onClick={() => setModal("posted")} />
                <StatCard title="Total Scheduled Content" value={(data?.kpis?.total_scheduled || 0).toString()}     sub="Scheduled Post"          icon={<CalendarIcon />} onClick={() => setModal("scheduled")} />
                <StatCard title="Total Engagement"        value={data?.kpis?.total_engagement || "0"} sub="Interactions"            icon={<ChartIcon />}   onClick={() => setModal("engagement")} />
              </div>
            </div>

            {/* Account Performance */}
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Account Performance</p>
              <div className="dash-acc-cards">
                {(data?.account_performance || []).map(a => <AccCard key={a.name} acc={a} onViewMore={() => setAccModal(a)} />)}
              </div>
            </div>

            {/* Scheduled Posts */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "22px 24px 0", border: "1px solid #e8edf3" }}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Scheduled Posts</p>
              <div className="dash-table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Post Title","Account","Date & Time ↓","Platform","Status"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#94a3b8", borderBottom: "none" }}>{h}</th>
                    ))}
                  </tr>
                  <tr><td colSpan={5} style={{ padding: "6px 0", background: "#fff" }} /></tr>
                </thead>
                <tbody>
                  {(data?.scheduled_posts || []).slice(0, 4).map((p, i) => <SchedRow key={i} post={p} />)}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="dash-right">

            {/* Connected Accounts */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #e8edf3" }}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Connected Accounts</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(data?.connected_accounts || []).length > 0 ? (
                  (data?.connected_accounts || []).map(a => <ConnRow key={a.handle} acc={a} />)
                ) : (
                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 10px" }}>No connected accounts found</p>
                    <button
                      onClick={() => router.push("/accounts")}
                      style={{ background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#2563eb")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#1e3a5f")}>
                      + Connect Account
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Summary per Pages */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #e8edf3" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Summary per Pages</p>
                <SmBtn onClick={() => setViewAllSummary(true)}>View All</SmBtn>
              </div>
              {(data?.summary_pages || []).slice(0, 2).map((pg, i) => (
                <SummaryCard
                  key={pg.name}
                  page={pg}
                  divider={i < Math.min((data?.summary_pages || []).length, 2) - 1}
                  onDetails={() => setSummaryModal(pg)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon, onClick }: { title: string; value: string; sub: string; icon: JSX.Element; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      flex: 1, minWidth: 0, cursor: "pointer",
      background: "#f0f2f5",
      border: "1px solid #e8edf3",
      borderRadius: 12,
      boxShadow: h ? "0 4px 14px rgba(0,0,0,0.09)" : "0 1px 4px rgba(0,0,0,0.06)",
      transform: h ? "translateY(-1px)" : "translateY(0)",
      transition: "all 0.15s",
      overflow: "hidden",
    }} className="dash-stat-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {icon}
        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: "#64748b" }}>{title}</p>
      </div>
      <p className="dash-stat-value" style={{ fontWeight: 700, margin: "0 0 6px", lineHeight: 1, color: "#1a202c" }}>{value}</p>
      <p style={{ fontSize: 12, fontStyle: "italic", margin: 0, color: "#94a3b8" }}>{sub}</p>
    </div>
  );
}

// ── Account Performance Card ──────────────────────────────────────────────────
function AccCard({ acc, onViewMore }: { acc: AccountPerformance; onViewMore: () => void }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onViewMore} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      flex: 1, minWidth: 0, borderRadius: 12, border: "1px solid #e8edf3",
      padding: "16px", background: "#fff", cursor: "pointer",
      boxShadow: h ? "0 4px 14px rgba(0,0,0,0.08)" : "none",
      transform: h ? "translateY(-1px)" : "translateY(0)", transition: "all 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Avatar name={acc.name} color={acc.color} size={42} />
        <span style={{ fontSize: 15, fontWeight: 700 }}>{acc.name}</span>
      </div>
      <div style={{ borderTop: "1px solid #f1f5f9", marginBottom: 8 }} />

      {/* ← NEW: Followers label */}
      <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Followers</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 3 }}>
        {acc.pairs.slice(0, 2).map(p => (
          <div key={p.plt} style={{ flex: 1, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name={p.plt} size={22} />
            <span style={{ fontSize: 17, fontWeight: 700 }}>{p.val}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 3 }}>
        {acc.pairs.slice(0, 2).map(p => <span key={p.plt} style={{ flex: 1, fontSize: 12, color: "#94a3b8" }}>{p.plt}</span>)}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {acc.pairs.slice(0, 2).map(p => (
          <div key={p.plt} style={{ flex: 1, display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 11, color: p.up ? "#16a34a" : "#ef4444" }}>{p.up ? "▲" : "▼"}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: p.up ? "#16a34a" : "#ef4444" }}>{p.delta}</span>
          </div>
        ))}
      </div>
      <span style={{ color: "#2563eb", fontSize: 12, fontWeight: 500 }}>view more</span>
    </div>
  );
}

// ── Scheduled Post Row ────────────────────────────────────────────────────────
function SchedRow({ post }: { post: ScheduledPost }) {
  const [h, setH] = useState(false);
  return (
    <tr onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: h ? "#f0f6ff" : "#f8fafc", transition: "background 0.15s" }}>
      <td style={TD}>{post.title}</td>
      <td style={TD}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Avatar name={post.account} color={post.aColor} size={26} />
          <span style={{ color: "#374151" }}>{post.account}</span>
        </div>
      </td>
      <td style={{ ...TD, color: "#64748b", whiteSpace: "nowrap" }}>{post.date}</td>
      <td style={TD}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name={post.platform} size={24} />
          <span>{post.platform}</span>
        </div>
      </td>
      <td style={TD}><span style={{ color: "#16a34a", fontWeight: 600, fontSize: 14 }}>Scheduled</span></td>
    </tr>
  );
}

const TD: React.CSSProperties = { padding: "14px 16px", fontSize: 14, borderBottom: "6px solid #fff" };

// ── Connected Account Row ─────────────────────────────────────────────────────
function ConnRow({ acc }: { acc: ConnectedAccount }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "7px 4px", cursor: "pointer", transition: "background 0.15s",
      background: h ? "#f8faff" : "transparent",
      borderRadius: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name={acc.platform} size={36} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>{acc.name}</p>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{acc.handle}</p>
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "3px 12px", whiteSpace: "nowrap", flexShrink: 0 }}>
        Connected
      </span>
    </div>
  );
}

// ── Summary Page Card ─────────────────────────────────────────────────────────
function SummaryCard({ page, divider, onDetails }: { page: SummaryPage; divider: boolean; onDetails: () => void }) {
  const [h, setH] = useState(false);
  return (
    <div style={{ paddingBottom: divider ? 14 : 0, marginBottom: divider ? 14 : 0, borderBottom: divider ? "1px solid #f1f5f9" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
        <Icon name={page.plt} size={32} />
        <span style={{ fontSize: 14, fontWeight: 700 }}>{page.name}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
        <span>Engagement</span><span>{page.thirdLabel}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
        <span>{page.engagement}</span><span>{page.third}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>Posts <strong style={{ color: "#1a202c" }}>{page.posts}</strong></span>
        <button
          onClick={onDetails}
          onMouseEnter={() => setH(true)}
          onMouseLeave={() => setH(false)}
          style={{ border: "1px solid #e2e8f0", borderRadius: 7, padding: "3px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: h ? "#1e3a5f" : "#fff", color: h ? "#fff" : "#1a202c", transition: "all 0.15s", fontFamily: "inherit" }}>
          Details
        </button>
      </div>
    </div>
  );
}